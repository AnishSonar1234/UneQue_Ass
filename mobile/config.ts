import { Platform } from "react-native";

function sanitizeUrl(url: string, defaultProtocol = "https"): string {
  let cleaned = url.trim().replace(/\/+$/, "");
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://") && !cleaned.startsWith("ws://") && !cleaned.startsWith("wss://")) {
    cleaned = `${defaultProtocol}://${cleaned}`;
  }
  return cleaned;
}

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return sanitizeUrl(process.env.EXPO_PUBLIC_API_URL, "https");
  }
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location?.origin
  ) {
    return window.location.origin.includes("localhost") ||
      window.location.origin.includes("127.0.0.1")
      ? "http://localhost:3000"
      : sanitizeUrl(window.location.origin, "https");
  }
  return "http://localhost:3000";
}

function getWsUrl(): string {
  if (process.env.EXPO_PUBLIC_WS_URL) {
    return sanitizeUrl(process.env.EXPO_PUBLIC_WS_URL, "wss");
  }
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location?.hostname
  ) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "localhost:3000"
        : window.location.host;
    return `${protocol}//${host}/ws`;
  }
  return "ws://localhost:3000/ws";
}

export const config = {
  get API_URL() {
    return getApiUrl();
  },
  get WS_URL() {
    return getWsUrl();
  },
  MAX_LIST_SIZE: 200,
  WS_RECONNECT_INITIAL_MS: 1000,
  WS_RECONNECT_MAX_MS: 30_000,
} as const;
