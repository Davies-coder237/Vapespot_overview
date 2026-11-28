import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X, Paperclip } from "lucide-react";
import {
  CHAT_ORDER_EVENT,
  getClientId,
  getOrderStamp,
  getVisitorLabel,
  saveOrderStamp,
} from "@/lib/chat";
import { TELEGRAM_HANDLE } from "@/lib/telegram";

// ── types du protocole (miroir du DO) ──
type ChatMsg = {
  from: string; // "client" | "admin" | "system"
  kind: string; // "text" | "image"
  text?: string;
  image?: string;
  at: string;
  seq: number;
};
type ServerFrame =
  | { type: "history"; messages: ChatMsg[] }
  | { type: "message"; message: ChatMsg };

type Status = "idle" | "connecting" | "open" | "reconnecting" | "offline";

const STATUS_TEXT: Record<Status, string> = {
  idle: "",
  connecting: "Connecting…",
  open: "We're here — a real person replies",
  reconnecting: "Reconnecting…",
  offline: "Offline — replies appear when you come back",
};
const STATUS_DOT: Record<Status, string> = {
  idle: "bg-[#9E9E9E]",
  connecting: "bg-amber-500 animate-pulse",
  open: "bg-green-500",
  reconnecting: "bg-amber-500 animate-pulse",
  offline: "bg-[#9E9E9E]",
};

export function ChatWidget() {
  const clientId = useMemo(() => getClientId(), []);
  const visitorLabel = useMemo(() => getVisitorLabel(), []);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const shouldConnectRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderRef = useRef("");
  const emailRef = useRef("");
  const amountRef = useRef("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // ── ouverture de la WebSocket (stable : lit les refs, jamais de closure périmée) ──
  const openWs = useCallback(() => {
    const ws = wsRef.current;
    if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
    const proto = location.protocol === "https:" ? "wss://" : "ws://";
    const params = new URLSearchParams();
    params.set("u", visitorLabel);
    if (orderRef.current && emailRef.current) {
      params.set("o", orderRef.current);
      params.set("e", emailRef.current);
      if (amountRef.current) params.set("amount", amountRef.current);
    }
    setStatus("connecting");
    const next = new WebSocket(
      `${proto}${location.host}/chat/${clientId}?${params.toString()}`,
    );
    wsRef.current = next;
    next.onopen = () => setStatus("open");
    next.onmessage = (e) => {
      try {
        const d = JSON.parse(String(e.data)) as ServerFrame;
        if (d.type === "history") setMessages(d.messages || []);
        else if (d.type === "message" && d.message)
          setMessages((m) => [...m, d.message]);
      } catch {
        /* frame inconnue ignorée */
      }
    };
    next.onclose = () => {
      setStatus("offline");
      scheduleReconnectRef.current();
    };
    next.onerror = () => {
      /* onclose suit */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, visitorLabel]);

  // ── reconnexion à backoff exponentiel (via ref pour briser le cycle openWs↔schedule) ──
  const scheduleReconnect = useCallback(() => {
    if (!shouldConnectRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const n = Math.min(reconnectAttemptRef.current++, 6);
    const delay = Math.min(1000 * Math.pow(2, n), 30000);
    setStatus("reconnecting");
    timerRef.current = setTimeout(() => {
      reconnectAttemptRef.current = 0;
      openWsRef.current();
    }, delay);
  }, []);

  const openWsRef = useRef(openWs);
  openWsRef.current = openWs;
  const scheduleReconnectRef = useRef(scheduleReconnect);
  scheduleReconnectRef.current = scheduleReconnect;

  const openPanel = useCallback(() => {
    setOpen(true);
    shouldConnectRef.current = true;
    openWsRef.current();
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    shouldConnectRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      wsRef.current?.close();
    } catch {
      /* ignoré */
    }
    wsRef.current = null;
  }, []);

  // Moment (b) : commande passée → ouvre + réépingle (o/e) + salutation serveur.
  useEffect(() => {
    const stamp = getOrderStamp();
    if (stamp) {
      orderRef.current = stamp.order;
      emailRef.current = stamp.email;
      amountRef.current = stamp.amount;
    }
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      orderRef.current = d.order;
      emailRef.current = d.email;
      amountRef.current = d.amount || "";
      saveOrderStamp({ order: d.order, email: d.email, amount: d.amount || "" });
      reconnectAttemptRef.current = 0;
      setOpen(true);
      shouldConnectRef.current = true;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignoré */
        }
      }
      openWsRef.current();
    };
    window.addEventListener(CHAT_ORDER_EVENT, h);
    return () => {
      window.removeEventListener(CHAT_ORDER_EVENT, h);
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        wsRef.current?.close();
      } catch {
        /* ignoré */
      }
    };
  }, []);

  // auto-scroll vers le bas
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) {
      setStatus("offline");
      openWsRef.current();
      return; // on garde le texte, l'utilisateur peut renvoyer
    }
    ws.send(JSON.stringify({ kind: "text", text }));
    setInput("");
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) {
      setStatus("offline");
      openWsRef.current();
      return;
    }
    // ÉTAPE 5 : envoie les octets de l'image en message binaire sur la WebSocket →
    // le DO stocke + relaie (sendPhoto) + diffuse. Le client verra sa photo
    // remonter (broadcast {kind:"image"}) juste après.
    try {
      const buf = await f.arrayBuffer();
      ws.send(buf);
    } catch {
      /* lecture fichier impossible — ignoré */
    }
  };

  const tgUrl = `https://t.me/${TELEGRAM_HANDLE}`;

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open live chat"
          onClick={openPanel}
          className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[1000] h-14 w-14 rounded-full bg-[#7C3AED] text-white shadow-xl hover:bg-[#6d28d9] transition-colors flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed left-0 right-0 top-0 bottom-0 z-[1000] flex flex-col bg-white border border-[#E8E8E8] md:left-auto md:right-5 md:bottom-24 md:top-auto md:h-[560px] md:w-[380px] md:rounded-2xl md:shadow-2xl">
          <div className="flex items-center gap-3 bg-[#7C3AED] px-4 py-3 text-white md:rounded-t-2xl">
            <div className="flex items-center justify-center rounded-full bg-white/15 h-9 w-9">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[15px] leading-tight">Vape Spot — live chat</p>
              <p className="flex items-center gap-1.5 text-[12px] text-white/85 leading-tight mt-0.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                {STATUS_TEXT[status] || "Tap to start a conversation"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={closePanel}
              className="shrink-0 rounded-full p-1 hover:bg-white/15 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto bg-[#FAFAFA] px-3 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-[13px] text-[#6E6E73] mt-6 px-6 leading-snug">
                Ask us anything — delivery, payment, a recommendation. A real person
                answers you here, usually within a couple of minutes.
              </div>
            )}
            {messages.map((m) => {
              if (m.from === "system") {
                return (
                  <div key={m.seq} className="flex justify-center">
                    <div className="max-w-[90%] text-center rounded-xl bg-[#EFEBFF] border border-[#E2DAFF] px-3 py-2 text-[12.5px] text-[#4A3F7A] leading-snug whitespace-pre-line">
                      {m.text}
                    </div>
                  </div>
                );
              }
              const mine = m.from === "client";
              return (
                <div key={m.seq} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13.5px] leading-snug whitespace-pre-line ${
                      mine
                        ? "bg-[#7C3AED] text-white rounded-br-sm"
                        : "bg-white border border-[#E8E8E8] text-black rounded-bl-sm"
                    }`}
                  >
                    {m.kind === "image" && m.image ? (
                      <>
                        <img
                          src={m.image}
                          alt="Shared photo"
                          loading="lazy"
                          className="max-h-64 w-full rounded-lg object-contain bg-black"
                        />
                        {m.text ? <p className="mt-1.5 text-[13px]">{m.text}</p> : null}
                      </>
                    ) : (
                      m.text
                    )}
                    <span
                      className={`block mt-1 text-[10px] ${
                        mine ? "text-white/60" : "text-[#9E9E9E]"
                      }`}
                    >
                      {new Date(m.at).toLocaleTimeString("en-AU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#E8E8E8] bg-white px-3 py-2.5 md:rounded-b-2xl">
            <div className="flex items-end gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                className="hidden"
                onChange={onImage}
              />
              <button
                type="button"
                aria-label="Send photo"
                onClick={() => fileRef.current?.click()}
                className="shrink-0 rounded-full p-2 text-[#7C3AED] hover:bg-[#F0EEFF]"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Type a message…"
                className="flex-1 resize-none rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-2 text-[13.5px] text-black placeholder:text-[#9E9E9E] focus:outline-none focus:border-[#7C3AED]"
              />
              <button
                type="button"
                aria-label="Send"
                onClick={send}
                disabled={!input.trim()}
                className={`shrink-0 rounded-full p-2.5 transition-colors ${
                  input.trim()
                    ? "bg-[#7C3AED] text-white hover:bg-[#6d28d9]"
                    : "bg-[#E8E8E8] text-[#9E9E9E] cursor-not-allowed"
                }`}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11.5px] text-[#9E9E9E]">
              Prefer Telegram?{" "}
              <a
                href={tgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7C3AED] font-semibold hover:underline"
              >
                continue on Telegram →
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}