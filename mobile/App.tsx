import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native";
import type { ListRenderItem } from "react-native";
import { useLeadsSocket } from "./useLeadsSocket";
import type { Lead } from "./useLeadsSocket";
import LeadRow from "./LeadRow";

// ─── Connection Badge ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  live: { color: "#22c55e", label: "● Live" },
  reconnecting: { color: "#f59e0b", label: "◌ Reconnecting" },
  offline: { color: "#ef4444", label: "✕ Offline" },
} as const;

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { leads, newLeadIds, connectionStatus } = useLeadsSocket();
  const statusConfig = STATUS_CONFIG[connectionStatus] || STATUS_CONFIG.reconnecting;

  const keyExtractor = useCallback((item: Lead) => item.id, []);

  const renderItem: ListRenderItem<Lead> = useCallback(
    ({ item }: { item: Lead }) => (
      <LeadRow lead={item} isNew={newLeadIds.has(item.id)} />
    ),
    [newLeadIds]
  );

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>Waiting for leads...</Text>
        <Text style={styles.emptySubtitle}>
          Submit a Meta Lead Ad form or use{"\n"}POST /dev/simulate to test
        </Text>
      </View>
    ),
    []
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <Text style={styles.countText}>
          {leads.length > 0
            ? `${leads.length} lead${leads.length !== 1 ? "s" : ""}`
            : ""}
        </Text>
      </View>
    ),
    [leads.length]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Leads</Text>
          <Text style={styles.headerSubtitle}>Meta Lead Ads · Real-time</Text>
        </View>
        <View style={[styles.badge, { borderColor: statusConfig.color }]}>
          <Text style={[styles.badgeText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Leads list */}
      <FlatList<Lead>
        data={leads}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={ListEmpty}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={
          leads.length === 0 ? styles.emptyContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS !== "web"}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e3a",
  },
  headerTitle: {
    color: "#e8e8f0",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: Platform.OS === "web" ? 0.5 : 0,
  },
  headerSubtitle: {
    color: "#4a5570",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  countText: {
    color: "#4a5570",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#b0b8d8",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#4a5570",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
