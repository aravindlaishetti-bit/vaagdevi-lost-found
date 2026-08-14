export type UserRole = "student" | "faculty" | "admin";
export type ItemType = "lost" | "found";
export type ItemStatus = "open" | "matched" | "claimed" | "closed";
export type MatchStatus = "suggested" | "confirmed" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  college_id: string;
  email: string;
  role: UserRole;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface AiLabels {
  category?: string;
  primary_color?: string;
  secondary_colors?: string[];
  brand_or_text?: string;
  distinguishing_features?: string[];
  description?: string;
}

export interface Item {
  id: string;
  reporter_id: string;
  type: ItemType;
  title: string;
  description: string;
  category: string | null;
  color: string | null;
  brand: string | null;
  location: string;
  date_occurred: string;
  status: ItemStatus;
  ai_labels: AiLabels | null;
  created_at: string;
  item_images?: { id: string; storage_path: string }[];
  profiles?: Pick<Profile, "full_name" | "department">;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "match_found" | "message" | "status_change";
  title: string;
  body: string | null;
  link_item_id: string | null;
  is_read: boolean;
  created_at: string;
}
export interface Match {
  id: string;
  lost_item_id: string;
  found_item_id: string;
  similarity_score: number;
  status: string;

  lost_item?: {
    id: string;
    reporter_id: string;
    title: string;
    type: ItemType;
    location: string;
    date_occurred: string;
    status: ItemStatus;
    item_images?: {
      storage_path: string;
    }[];
  };

  found_item?: {
    id: string;
    reporter_id: string;
    title: string;
    type: ItemType;
    location: string;
    date_occurred: string;
    status: ItemStatus;
    item_images?: {
      storage_path: string;
    }[];
  };
}