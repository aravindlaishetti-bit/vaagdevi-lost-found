import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { Notification } from "../types";

export default function NotificationBell() {
  const { profile } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) {
      setNotifications([]);
      return;
    }

    loadNotifications();

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;

          setNotifications((current) => [
            notification,
            ...current,
          ]);
        }
      )
      .subscribe((status) => {
        console.log("NOTIFICATION REALTIME STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function loadNotifications() {
    if (!profile?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.error("NOTIFICATION LOAD ERROR:", error);
      setNotifications([]);
    } else {
      setNotifications(
        (data as Notification[]) ?? []
      );
    }

    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", id);

    if (error) {
      console.error("NOTIFICATION READ ERROR:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              is_read: true,
            }
          : notification
      )
    );
  }

  async function markAllAsRead() {
    if (!profile?.id) return;

    const unreadIds = notifications
      .filter((notification) => !notification.is_read)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .in("id", unreadIds);

    if (error) {
      console.error(
        "MARK ALL NOTIFICATIONS ERROR:",
        error
      );
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  }

  function getIcon(type: Notification["type"]) {
    if (type === "match_found") {
      return "🤝";
    }

    if (type === "message") {
      return "💬";
    }

    if (type === "status_change") {
      return "🔔";
    }

    return "🔔";
  }

  function formatTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  if (!profile) {
    return null;
  }

  return (
    <div className="relative">

      {/* BELL BUTTON */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* UNREAD BADGE */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      {open && (
        <>
          {/* MOBILE BACKDROP */}
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-24px)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Notifications
                </h3>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  Stay updated with your reports
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}

            </div>

            {/* CONTENT */}
            <div className="max-h-[420px] overflow-y-auto">

              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                </div>
              ) : notifications.length === 0 ? (

                <div className="px-6 py-12 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
                    🔔
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    No notifications
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    You’re all caught up!
                  </p>

                </div>

              ) : (

                <div className="divide-y divide-slate-100">

                  {notifications.map((notification) => {

                    const content = (
                      <div
                        className={`flex gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                          notification.is_read
                            ? "bg-white"
                            : "bg-blue-50/50"
                        }`}
                      >

                        {/* ICON */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                            notification.is_read
                              ? "bg-slate-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {getIcon(notification.type)}
                        </div>

                        {/* TEXT */}
                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-2">

                            <p className="text-sm font-semibold text-slate-800">
                              {notification.title}
                            </p>

                            {!notification.is_read && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}

                          </div>

                          {notification.body && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {notification.body}
                            </p>
                          )}

                          <p className="mt-1.5 text-[10px] text-slate-400">
                            {formatTime(
                              notification.created_at
                            )}
                          </p>

                        </div>

                      </div>
                    );

                    if (notification.link_item_id) {
                      return (
                        <Link
                          key={notification.id}
                          to={`/items/${notification.link_item_id}`}
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }

                            setOpen(false);
                          }}
                          className="block"
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                        }}
                        className="block w-full text-left"
                      >
                        {content}
                      </button>
                    );
                  })}

                </div>
              )}

            </div>

            {/* FOOTER */}
            {notifications.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center">
                <span className="text-[10px] font-medium text-slate-400">
                  Vaagdevi Lost & Found
                </span>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}