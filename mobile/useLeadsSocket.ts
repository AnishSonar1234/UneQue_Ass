import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { config } from "./config";

export interface Lead {
  id: string;
  formId: string;
  pageId: string;
  adId?: string;
  adgroupId?: string;
  createdTime: number;
  receivedAt: string;
  fields: Record<string, string>;
  status: "ok" | "fetch_failed";
}

export type ConnectionStatus = "live" | "reconnecting" | "offline";

interface UseLeadsSocketResult {
  leads: Lead[];
  newLeadIds: Set<string>;
  connectionStatus: ConnectionStatus;
}

function clampList(leads: Lead[]): Lead[] {
  return leads.length > config.MAX_LIST_SIZE
    ? leads.slice(0, config.MAX_LIST_SIZE)
    : leads;
}

export function useLeadsSocket(): UseLeadsSocketResult {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("reconnecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef<number>(config.WS_RECONNECT_INITIAL_MS);
  const isMountedRef = useRef(true);
  const latestLeadTimeRef = useRef<string | undefined>(undefined);

  // ─── fetchLeads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async (since?: string): Promise<Lead[] | null> => {
    try {
      let url = since
        ? `${config.API_URL}/leads?since=${encodeURIComponent(since)}`
        : `${config.API_URL}/leads`;
      if (url.includes("ngrok")) {
        url += `${url.includes("?") ? "&" : "?"}ngrok-skip-browser-warning=true`;
      }
      const res = await fetch(url, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as Lead[];
    } catch (err) {
      console.warn("[useLeadsSocket] fetchLeads error:", err);
      return null;
    }
  }, []);

  // ─── addNewLead ────────────────────────────────────────────────────────────
  const addNewLead = useCallback((lead: Lead) => {
    setLeads((prev) => {
      if (prev.some((l) => l.id === lead.id)) return prev;
      const next = clampList([lead, ...prev]);
      if (
        !latestLeadTimeRef.current ||
        lead.receivedAt > latestLeadTimeRef.current
      ) {
        latestLeadTimeRef.current = lead.receivedAt;
      }
      return next;
    });

    setNewLeadIds((prev) => {
      const next = new Set(prev);
      next.add(lead.id);
      setTimeout(() => {
        setNewLeadIds((s) => {
          const updated = new Set(s);
          updated.delete(lead.id);
          return updated;
        });
      }, 2000);
      return next;
    });
  }, []);

  // ─── scheduleReconnect (defined BEFORE connect so connect can reference it) ─
  const scheduleReconnectRef = useRef<() => void>(() => undefined);

  // ─── connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus("reconnecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(config.WS_URL);
    } catch (err) {
      console.warn("[useLeadsSocket] WebSocket constructor failed:", err);
      setConnectionStatus("offline");
      scheduleReconnectRef.current();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      void (async () => {
        if (!isMountedRef.current) return;
        console.log("[useLeadsSocket] WebSocket connected");
        setConnectionStatus("live");
        reconnectDelayRef.current = config.WS_RECONNECT_INITIAL_MS;

        const since = latestLeadTimeRef.current;
        try {
          const catchup = await fetchLeads(since);
          if (catchup && catchup.length > 0) {
            setLeads((prev) => {
              const existingIds = new Set(prev.map((l) => l.id));
              const fresh = catchup.filter((l) => !existingIds.has(l.id));
              if (fresh.length === 0) return prev;
              const latest = fresh.reduce((a, b) =>
                a.receivedAt > b.receivedAt ? a : b
              );
              if (
                !latestLeadTimeRef.current ||
                latest.receivedAt > latestLeadTimeRef.current
              ) {
                latestLeadTimeRef.current = latest.receivedAt;
              }
              return clampList([...fresh, ...prev]);
            });
          }
        } catch (err) {
          console.warn("[useLeadsSocket] Catch-up fetch failed:", err);
        }
      })();
    };

    // React Native WebSocket fires onmessage with a native event object.
    // We type it as `any` here because React Native's WebSocketMessageEvent
    // is not exported from @types/react-native — the shape is { data: string }.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws.onmessage = (event: any) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          data?: Lead;
        };
        if (msg.type === "lead" && msg.data) {
          addNewLead(msg.data);
        }
      } catch {
        console.warn("[useLeadsSocket] Failed to parse WS message");
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      console.log("[useLeadsSocket] WebSocket closed, scheduling reconnect");
      setConnectionStatus("offline");
      scheduleReconnectRef.current();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws.onerror = (_e: any) => {
      console.warn("[useLeadsSocket] WebSocket error");
      setConnectionStatus("offline");
      // onclose fires after onerror; reconnect triggered there
    };
  }, [fetchLeads, addNewLead]);

  // Wire scheduleReconnect after connect is defined to avoid circular deps
  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (reconnectTimeoutRef.current) return;

    const delay = reconnectDelayRef.current;
    console.log(`[useLeadsSocket] Reconnecting in ${delay}ms`);
    setConnectionStatus("reconnecting");

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (isMountedRef.current) connect();
    }, delay);

    reconnectDelayRef.current = Math.min(
      delay * 2,
      config.WS_RECONNECT_MAX_MS
    );
  }, [connect]);

  // Keep the ref in sync so ws.onclose can always call the latest version
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // ─── Initial load + connect ────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    void (async () => {
      const initial = await fetchLeads();
      if (initial && initial.length > 0) {
        setLeads(clampList(initial));
        const latest = initial.reduce((a, b) =>
          a.receivedAt > b.receivedAt ? a : b
        );
        latestLeadTimeRef.current = latest.receivedAt;
      }
      connect();
    })();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── AppState: reconnect on foreground ────────────────────────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        console.log("[useLeadsSocket] App foregrounded, reconnecting");
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        reconnectDelayRef.current = config.WS_RECONNECT_INITIAL_MS;
        connect();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [connect]);

  return { leads, newLeadIds, connectionStatus };
}
