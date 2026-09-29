import React, { memo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import type { Lead } from "./useLeadsSocket";

interface Props {
  lead: Lead;
  isNew: boolean;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const LeadRow = memo(({ lead, isNew }: Props) => {
  const highlight = useRef(new Animated.Value(isNew ? 1 : 0)).current;

  useEffect(() => {
    if (isNew) {
      highlight.setValue(1);
      Animated.timing(highlight, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: false,
      }).start();
    }
  }, [isNew, highlight]);

  const backgroundColor = highlight.interpolate({
    inputRange: [0, 1],
    outputRange: ["#1a1a2e", "#1e3a5f"],
  });

  const name = lead.fields.full_name ?? lead.fields.name ?? "Unknown";
  const email = lead.fields.email ?? lead.fields.email_address ?? "—";
  const phone = lead.fields.phone_number ?? lead.fields.phone ?? "—";

  const knownKeys = new Set([
    "full_name",
    "name",
    "email",
    "email_address",
    "phone_number",
    "phone",
  ]);
  const extraFields = Object.entries(lead.fields).filter(
    ([k]) => !knownKeys.has(k)
  );

  return (
    <Animated.View style={[styles.card, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.time}>{formatRelativeTime(lead.receivedAt)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>✉</Text>
        <Text style={styles.value}>{email}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>📞</Text>
        <Text style={styles.value}>{phone}</Text>
      </View>

      {extraFields.map(([key, val]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{key.replace(/_/g, " ")}</Text>
          <Text style={styles.value}>{val}</Text>
        </View>
      ))}

      <View style={styles.footer}>
        {lead.status === "fetch_failed" && (
          <Text style={styles.errorBadge}>⚠ Data fetch failed</Text>
        )}
        <Text style={styles.formId}>Form: {lead.formId}</Text>
      </View>
    </Animated.View>
  );
});

LeadRow.displayName = "LeadRow";

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    color: "#e8e8f0",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  time: {
    color: "#6b7db3",
    fontSize: 12,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    color: "#6b7db3",
    fontSize: 13,
    width: 20,
    textAlign: "center",
    marginRight: 8,   // replaced `gap` — not in all RN type defs
  },
  value: {
    color: "#b0b8d8",
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2a4a",
  },
  formId: {
    color: "#4a5570",
    fontSize: 11,
  },
  errorBadge: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default LeadRow;
export type { Lead };
