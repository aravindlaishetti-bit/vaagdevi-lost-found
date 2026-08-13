import { useEffect, useState } from "react";
function timeAgo(date: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

type Notification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
item_id?: string;
link?: string;
};

export default function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    loadNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function loadNotifications() {
    if (!profile?.id) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    setNotifications(data ?? []);
  }

  async function markAllRead() {
    if (!profile?.id) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profile.id);

    loadNotifications();
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          markAllRead();
        }}
        className="relative text-xl"
      >
        🔔

        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white shadow-lg z-50">
          <div className="p-3 border-b font-semibold">
            Notifications
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.link || (n.item_id ? `/items/${n.item_id}` : "/dashboard")}
                className="block p-3 border-b hover:bg-gray-50"
              >
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-xs text-gray-500">{n.body}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
