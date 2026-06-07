import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

let socket: Socket | null = null;

const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export function useSocket(events: Record<string, () => void>) {
  const savedCallbacks = useRef(events);
  savedCallbacks.current = events;

  useEffect(() => {
    const sock = getSocket();
    if (!sock.connected) {
      const token = localStorage.getItem("accessToken");
      sock.auth = { token };
      sock.connect();
    }

    const handlers: Record<string, (...args: unknown[]) => void> = {};
    for (const [event, cb] of Object.entries(events)) {
      const handler = () => cb();
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
