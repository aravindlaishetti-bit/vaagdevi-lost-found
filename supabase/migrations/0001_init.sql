-- ============================================================================
-- Vaagdevi College Lost & Found — Core Schema
-- Run this in Supabase SQL editor, or via `supabase db push`
-- ============================================================================

create extension if not exists vector;
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('student', 'faculty', 'admin');
create type item_status as enum ('open', 'matched', 'claimed', 'closed');
create type item_type as enum ('lost', 'found');
create type match_status as enum ('suggested', 'confirmed', 'rejected');

-- ----------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users, created on signup via trigger)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  college_id text not null,                 -- roll number / employee id
  email text not null unique,
  role user_role not null default 'student',
  department text,
  phone text,
  avatar_url text,
  is_verified boolean not null default false, -- admin-verified college member
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Only allow signups with the college email domain.
create or replace function public.enforce_college_domain()
returns trigger language plpgsql as $$
begin
  if new.email !~* '@vaagdevi\.edu\.in$' then
    raise exception 'Only @vaagdevi.edu.in email addresses may register';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_college_domain
  before insert on public.profiles
  for each row execute function public.enforce_college_domain();

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, college_id, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'college_id', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- ITEMS
-- ----------------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  type item_type not null,
  title text not null,
  description text not null,
  category text,                 -- e.g. "electronics", "id-card", "bag"
  color text,                    -- dominant color, from AI or user
  brand text,
  location text not null,        -- where lost/found on campus
  date_occurred date not null,
  status item_status not null default 'open',
  ai_labels jsonb,                -- raw AI vision output (objects, ocr text, colors, tags)
  embedding vector(1536),         -- text-embedding-3-small on title+description+ai_labels
  created_at timestamptz not null default now()
);

create index items_type_status_idx on public.items (type, status);
create index items_embedding_idx on public.items using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.items enable row level security;

-- ----------------------------------------------------------------------------
-- ITEM IMAGES  (an item can have multiple photos; storage bucket "item-images")
-- ----------------------------------------------------------------------------
create table public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.item_images enable row level security;

-- ----------------------------------------------------------------------------
-- MATCHES  (AI-suggested pairing between a lost item and a found item)
-- ----------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.items(id) on delete cascade,
  found_item_id uuid not null references public.items(id) on delete cascade,
  similarity_score numeric(5,4) not null,   -- 0..1
  status match_status not null default 'suggested',
  created_at timestamptz not null default now(),
  unique (lost_item_id, found_item_id)
);

create index matches_lost_idx on public.matches (lost_item_id, similarity_score desc);
create index matches_found_idx on public.matches (found_item_id, similarity_score desc);

alter table public.matches enable row level security;

-- ----------------------------------------------------------------------------
-- MESSAGES  (secure chat, scoped to a match so strangers can't DM at large)
-- ----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_match_idx on public.messages (match_id, created_at);

alter table public.messages enable row level security;

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,             -- 'match_found' | 'message' | 'status_change'
  title text not null,
  body text,
  link_item_id uuid references public.items(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- PROFILES: anyone authenticated can read basic profile info (needed to show
-- "reported by"), but can only edit their own row. Admins can update roles.
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ITEMS: any verified authenticated user can read all items (that's the point
-- of a public lost & found board). Only the reporter or an admin can modify.
create policy "items are readable by verified users"
  on public.items for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_verified)
  );

create policy "verified users can insert their own items"
  on public.items for insert
  with check (
    auth.uid() = reporter_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_verified)
  );

create policy "reporter or admin can update item"
  on public.items for update
  using (
    auth.uid() = reporter_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "reporter or admin can delete item"
  on public.items for delete
  using (
    auth.uid() = reporter_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ITEM IMAGES: readable alongside items; writable by the item's reporter.
create policy "item images readable by verified users"
  on public.item_images for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_verified)
  );

create policy "reporter can add images to their item"
  on public.item_images for insert
  with check (
    exists (
      select 1 from public.items i
      where i.id = item_id and i.reporter_id = auth.uid()
    )
  );

-- MATCHES: visible only to the two reporters involved (and admins).
create policy "match participants can view"
  on public.matches for select
  using (
    exists (
      select 1 from public.items li join public.items fi
        on li.id = lost_item_id and fi.id = found_item_id
      where li.reporter_id = auth.uid() or fi.reporter_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "match participants can update status"
  on public.matches for update
  using (
    exists (
      select 1 from public.items li join public.items fi
        on li.id = lost_item_id and fi.id = found_item_id
      where li.reporter_id = auth.uid() or fi.reporter_id = auth.uid()
    )
  );

-- system (service role, via edge function) inserts matches — no client insert policy.

-- MESSAGES: only the two participants of the parent match can read/write.
create policy "match participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      join public.items li on li.id = m.lost_item_id
      join public.items fi on fi.id = m.found_item_id
      where m.id = match_id
        and (li.reporter_id = auth.uid() or fi.reporter_id = auth.uid())
    )
  );

create policy "match participants can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      join public.items li on li.id = m.lost_item_id
      join public.items fi on fi.id = m.found_item_id
      where m.id = match_id
        and (li.reporter_id = auth.uid() or fi.reporter_id = auth.uid())
    )
  );

-- NOTIFICATIONS: users see only their own.
create policy "users read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users can mark their notifications read"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ============================================================================
-- REALTIME
-- ============================================================================
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;

-- ============================================================================
-- RPC: vector similarity search used by the compute-matches edge function
-- ============================================================================
create or replace function public.find_candidate_matches(
  p_item_id uuid,
  p_opposite_type item_type,
  p_match_count int default 5
)
returns table (
  candidate_id uuid,
  similarity double precision
)
language sql stable as $$
  select i2.id as candidate_id,
         1 - (i1.embedding <=> i2.embedding) as similarity
  from public.items i1
  join public.items i2
    on i2.type = p_opposite_type
   and i2.status = 'open'
   and i2.id <> i1.id
  where i1.id = p_item_id
  order by i1.embedding <=> i2.embedding
  limit p_match_count;
$$;
