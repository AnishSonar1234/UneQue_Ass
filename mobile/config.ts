import { Platform } from "react-native";

const NGROK_HOST = "pasture-palatable-resample.ngrok-free.dev";

function getApiUrl(): string {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location?.hostname === "localhost" ||
      window.location?.hostname === "127.0.0.1")
  ) {
    return "http://localhost:3000";
  }
  return `https://${NGROK_HOST}`;
}

function getWsUrl(): string {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location?.hostname === "localhost" ||
      window.location?.hostname === "127.0.0.1")
  ) {
    return "ws://localhost:3000/ws";
  }
  return `wss://${NGROK_HOST}/ws?ngrok-skip-browser-warning=true`;
}

export const config = {
  get API_URL() {
    return getApiUrl();
  },
  get WS_URL() {
    return getWsUrl();
  },
  // Max leads to keep in the list
  MAX_LIST_SIZE: 200,
  // WebSocket reconnect backoff: starts at 1s, caps at 30s
  WS_RECONNECT_INITIAL_MS: 1000,
  WS_RECONNECT_MAX_MS: 30_000,
} as const;
