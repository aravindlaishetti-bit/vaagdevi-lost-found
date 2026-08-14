import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { Message } from "../types";

type ChatPanelProps = {
  matchId: string;
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateKey(date: Date | string) {
  const value = date instanceof Date ? date : new Date(date);

  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function formatDateLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const todayKey = getDateKey(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const yesterdayKey = getDateKey(yesterday);
  const messageKey = getDateKey(dateString);

  if (messageKey === todayKey) {
    return "TODAY";
  }

  if (messageKey === yesterdayKey) {
    return "YESTERDAY";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ChatPanel({ matchId }: ChatPanelProps) {
  const { profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  /*
   * LOAD MESSAGES
   */
  useEffect(() => {
    let mounted = true;

    async function loadMessages() {
      setLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("MESSAGE LOAD ERROR:", error);
      }

      if (mounted) {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      }
    }

    loadMessages();

    /*
     * REALTIME
     */
    const channel = supabase
      .channel(`chat-${matchId}`)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((current) => {
            if (
              current.some(
                (message) => message.id === newMessage.id
              )
            ) {
              return current;
            }

            return [...current, newMessage];
          });
        }
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;

          setMessages((current) =>
            current.map((message) =>
              message.id === updatedMessage.id
                ? updatedMessage
                : message
            )
          );
        }
      )

      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  /*
   * AUTO SCROLL
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

  /*
   * MARK RECEIVED MESSAGES AS READ
   */
  useEffect(() => {
    if (!profile || messages.length === 0) {
      return;
    }

    async function markMessagesAsRead() {
      const unreadMessageIds = messages
        .filter(
          (message) =>
            message.sender_id !== profile!.id &&
            !message.read_at
        )
        .map((message) => message.id);

      if (unreadMessageIds.length === 0) {
        return;
      }

      const readAt = new Date().toISOString();

      const { error } = await supabase
        .from("messages")
        .update({
          read_at: readAt,
        })
        .in("id", unreadMessageIds);

      if (error) {
        console.error("READ RECEIPT ERROR:", error);
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          unreadMessageIds.includes(message.id)
            ? {
                ...message,
                read_at: readAt,
              }
            : message
        )
      );
    }

    markMessagesAsRead();
  }, [messages, profile]);

  /*
   * SEND MESSAGE
   */
  async function send() {
    const text = body.trim();

    if (!text || !profile || sending) {
      return;
    }

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: profile.id,
      body: text,
      read_at: null,
    });

    if (error) {
      console.error("MESSAGE SEND ERROR:", error);

      alert("Unable to send message. Please try again.");
    } else {
      setBody("");
    }

    setSending(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  /*
   * DATE TRACKING
   */
  let previousDateKey = "";

  return (
    <div className="flex h-[520px] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">

        <div className="flex items-center gap-3">

          {/* CHAT ICON */}
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">

            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            </svg>

          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">
              Item Owner Chat
            </p>

            <div className="mt-0.5 flex items-center gap-1.5">

              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs text-slate-500">
                Secure campus chat
              </span>

            </div>
          </div>

        </div>

        {/* OPTIONS */}
        <button
          type="button"
          aria-label="Chat options"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>

      </div>

      {/* CHAT BODY */}
      <div className="flex-1 overflow-y-auto bg-[#f8fafc] px-3 py-4 sm:px-5">

        {/* SECURITY NOTICE */}
        <div className="mx-auto mb-5 max-w-md rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">

          <div className="mb-1 flex items-center justify-center gap-2">

            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600"
            >
              <rect
                x="4"
                y="10"
                width="16"
                height="10"
                rx="2"
              />

              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>

            <span className="text-xs font-semibold text-blue-700">
              Campus Lost & Found
            </span>

          </div>

          <p className="text-[11px] leading-4 text-blue-600">
            Use this chat to safely coordinate the item handover.
          </p>

        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-10">

            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          </div>
        )}

        {/* EMPTY CHAT */}
        {!loading && messages.length === 0 && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">

            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">

              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-4-.9L3 20l1.3-4.2A8.5 8.5 0 1 1 21 11.5z" />
              </svg>

            </div>

            <h3 className="text-sm font-bold text-slate-800">
              Start a conversation
            </h3>

            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
              Send a message to coordinate where and when you can
              hand over the item.
            </p>

          </div>
        )}

        {/* MESSAGES */}
        {!loading && messages.length > 0 && (
          <div className="space-y-2">

            {messages.map((message) => {

              const isMine =
                message.sender_id === profile?.id;

              const currentDateKey =
                getDateKey(message.created_at);

              const showDate =
                currentDateKey !== previousDateKey;

              previousDateKey = currentDateKey;

              return (
                <div key={message.id}>

                  {/* DATE */}
                  {showDate && (
                    <div className="my-5 flex justify-center">

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold tracking-wide text-slate-500 shadow-sm">
                        {formatDateLabel(message.created_at)}
                      </span>

                    </div>
                  )}

                  {/* MESSAGE ROW */}
                  <div
                    className={`flex w-full ${
                      isMine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div className="max-w-[82%] sm:max-w-[70%]">

                      {/* BUBBLE */}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
                          isMine
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}
                      >

                        <p className="whitespace-pre-wrap break-words text-sm leading-5">
                          {message.body}
                        </p>

                        {/* TIME + WHATSAPP STYLE TICKS */}
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 ${
                            isMine
                              ? "text-blue-100"
                              : "text-slate-400"
                          }`}
                        >

                          <span className="text-[10px]">
                            {formatTime(message.created_at)}
                          </span>

                          {isMine && (
                            <span
                              className={`text-[11px] font-bold tracking-[-2px] ${
                                message.read_at
                                  ? "text-sky-200"
                                  : "text-blue-100"
                              }`}
                              title={
                                message.read_at
                                  ? "Read"
                                  : "Delivered"
                              }
                            >
                              ✓✓
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              );
            })}

            <div ref={bottomRef} />

          </div>
        )}

      </div>

      {/* MESSAGE INPUT */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white p-3"
      >

        <div className="flex items-end gap-2">

          {/* INPUT */}
          <div className="flex min-h-[44px] flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">

            <textarea
              rows={1}
              value={body}
              onChange={(event) =>
                setBody(event.target.value)
              }
              onKeyDown={(event) => {

                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  send();
                }

              }}
              placeholder="Type a message..."
              className="max-h-24 w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />

          </div>

          {/* SEND */}
          <button
            type="submit"
            disabled={!body.trim() || sending}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >

            {sending ? (

              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

            ) : (

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
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4Z" />
              </svg>

            )}

          </button>

        </div>

        <p className="mt-2 px-1 text-center text-[10px] text-slate-400">
          Enter to send • Shift + Enter for a new line
        </p>

      </form>

    </div>
  );
}