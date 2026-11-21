import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import api from "@/lib/axios";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

// `any` so handlers can declare the payload shape they expect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketHandler = (...args: any[]) => void;

let socket: Socket | null = null;
let authRetried = false;

const readToken = () => {
  try {
    return localStorage.getItem("accessToken");
  } catch {
    return null;
  }
};

// The server only delivers an admin's personal events (e.g. refund requests)
// to a socket it has authenticated. If the stored token was stale when the
// socket (re)connected, refresh it once through the API and authenticate again.
const handleAuthResult = async (result?: { success?: boolean }) => {
  if (result?.success || authRetried || !socket) return;
  authRetried = true;
  try {
    await api.get("/api/auth/me"); // the axios interceptor refreshes an expired token
    const token = readToken();
    if (token) socket.emit("authenticate", { token });
  } catch {
    // Refresh failed; the interceptor sends the admin back to login.
  }
};

const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      // A function, so every reconnect sends the current token, not the one
      // from when the page loaded.
      auth: (cb) => cb({ token: readToken() }),
    });
    socket.on("connect", () => {
      authRetried = false;
    });
    socket.on("authenticated", handleAuthResult);
  }
  return socket;
};

export function useSocket(events: Record<string, SocketHandler>) {
  const savedCallbacks = useRef(events);
  savedCallbacks.current = events;

  useEffect(() => {
    const sock = getSocket();
    if (!sock.connected) sock.connect();

    const handlers: Record<string, SocketHandler> = {};
    for (const event of Object.keys(savedCallbacks.current)) {
      const handler: SocketHandler = (...args) => savedCallbacks.current[event]?.(...args);
      handlers[event] = handler;
      sock.on(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        sock.off(event, handler);
      }
    };
  }, []);

  return getSocket();
}

export function useRealtimeRefresh(refetch: () => void, events: string[]) {
  const stableRefetch = useCallback(() => refetch(), [refetch]);

  useSocket(
    Object.fromEntries(events.map((e) => [e, stableRefetch])),
  );
}
