
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { Message } from "../types";

type ChatPanelProps = {
  matchId: string;
};

function getDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  if (getDateKey(date) === getDateKey(now)) {
    return "TODAY";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (getDateKey(date) === getDateKey(yesterday)) {
    return "YESTERDAY";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPanel({ matchId }: ChatPanelProps) {
  const { profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadMessages() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("CHAT MESSAGE ERROR:", error);
        setMessages([]);
        setErrorMessage(
          "Unable to load chat messages. Please try again."
        );
      } else {
        setMessages((data as Message[]) ?? []);
      }

      setLoading(false);
    }

    loadMessages();

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
            const alreadyExists = current.some(
              (message) => message.id === newMessage.id
            );

            if (alreadyExists) {
              return current;
            }

            return [...current, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log("CHAT REALTIME STATUS:", status);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!profile || messages.length === 0) {
      return;
    }

    const unreadIds = messages
      .filter(
        (message) =>
          message.sender_id !== profile.id &&
          !message.read_at
      )
      .map((message) => message.id);

    if (unreadIds.length === 0) {
      return;
    }

    async function markAsRead() {
      const readAt = new Date().toISOString();

      const { error } = await supabase
        .from("messages")
        .update({
          read_at: readAt,
        })
        .in("id", unreadIds);

      if (error) {
        console.error("READ RECEIPT ERROR:", error);
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(message.id)
            ? {
                ...message,
                read_at: readAt,
              }
            : message
        )
      );
    }

    markAsRead();
  }, [messages, profile]);

  async function send() {
    const text = body.trim();

    if (!text || !profile || !matchId || sending) {
      return;
    }

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: profile.id,
        body: text,
      })
      .select()
      .single();

    if (error) {
      console.error("SEND MESSAGE ERROR:", error);

      alert(
        "Message could not be sent. Please make sure the match is confirmed."
      );
    } else {
      setBody("");

      if (data) {
        setMessages((current) => {
          const exists = current.some(
            (message) => message.id === data.id
          );

          if (exists) {
            return current;
          }

          return [...current, data as Message];
        });
      }
    }

    setSending(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  let previousDateKey = "";

  return (
    <div className="flex h-[520px] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
            💬
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

        <div className="rounded-full bg-emerald-50 px-3 py-1">
          <span className="text-[10px] font-semibold text-emerald-600">
            ● ONLINE
          </span>
        </div>

      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5">

        {/* SECURITY NOTICE */}
        <div className="mx-auto mb-5 max-w-md rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">

          <p className="text-xs font-semibold text-blue-700">
            🔒 Vaagdevi Lost & Found
          </p>

          <p className="mt-1 text-[11px] leading-4 text-blue-600">
            Use this chat to safely coordinate the item handover.
          </p>

        </div>

        {/* ERROR */}
        {errorMessage && (
          <div className="mx-auto mb-4 max-w-md rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center">

            <p className="text-xs font-medium text-red-600">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 text-xs font-semibold text-red-700 underline"
            >
              Refresh page
            </button>

          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        )}

        {/* EMPTY */}
        {!loading &&
          !errorMessage &&
          messages.length === 0 && (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                💬
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

              const currentDateKey = getDateKey(
                message.created_at
              );

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

                  {/* MESSAGE */}
                  <div
                    className={`flex w-full ${
                      isMine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div className="max-w-[82%] sm:max-w-[70%]">

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

      {/* INPUT */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white p-3"
      >

        <div className="flex items-end gap-2">

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
              disabled={!profile || sending}
              className="max-h-24 w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
            />

          </div>

          <button
            type="submit"
            disabled={
              !body.trim() ||
              sending ||
              !profile
            }
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