import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { GradientHeader } from "@/components/GradientHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  className: string;
  markedAt: string;
}

interface Session {
  id: string;
  teacherId: string;
  className: string;
  expiresAt: string;
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const { data: records, isLoading } = useQuery({
    queryKey: ["student-attendance"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/attendance/my"), { credentials: "include" });
      return res.json() as Promise<AttendanceRecord[]>;
    },
    refetchInterval: 10000,
  });

  const { data: sessions } = useQuery({
    queryKey: ["student-sessions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/sessions/active"), { credentials: "include" });
      return res.json() as Promise<Session[]>;
    },
    refetchInterval: 10000,
  });

  const totalSessions = (sessions ?? []).filter((s) => s.className === user?.className).length;
  const attendancePercent = totalSessions > 0 && records
    ? Math.round((records.length / totalSessions) * 100)
    : 0;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="My Attendance"
        subtitle={`${user?.name ?? ""} · ${user?.className ?? ""}`}
        right={
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />
      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={records ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{attendancePercent}%</Text>
                <Text style={styles.summaryLabel}>Attendance</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                <Text style={styles.summaryLabel}>All Verified</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No attendance yet</Text>
              <Text style={styles.emptyHint}>Go to Scan QR tab to mark attendance</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardClass}>{item.className}</Text>
                <Text style={styles.cardTime}>
                  {new Date(item.markedAt).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.cardTimeSub}>
                  {new Date(item.markedAt).toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.presentBadge}>
                <Text style={styles.presentBadgeText}>Present</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  logoutBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryNum: { fontFamily: "Inter_700Bold", fontSize: 34, color: Colors.accent },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  divider: { width: 1, height: 40, backgroundColor: Colors.border },
  empty: { alignItems: "center", marginTop: 40, gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  emptyHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.successPale,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardClass: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  cardTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardTimeSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  presentBadge: {
    backgroundColor: Colors.successPale,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  presentBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.success },
});
