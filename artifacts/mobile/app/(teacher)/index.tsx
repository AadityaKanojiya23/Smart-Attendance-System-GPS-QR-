import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
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

interface Session {
  id: string;
  teacherId: string;
  className: string;
  expiresAt: string;
  qrToken: string;
}
interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  className: string;
  markedAt: string;
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const { data: mySessions, isLoading } = useQuery({
    queryKey: ["teacher-sessions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/sessions/my"), { credentials: "include" });
      return res.json() as Promise<Session[]>;
    },
    refetchInterval: 5000,
  });

  const activeSessions = (mySessions ?? []).filter(
    (s) => new Date(s.expiresAt) > new Date()
  );

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Teacher Dashboard"
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
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{mySessions?.length ?? 0}</Text>
              <Text style={styles.summaryLabel}>Total Sessions</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>{activeSessions.length}</Text>
              <Text style={styles.summaryLabel}>Active Now</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {mySessions?.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="qr-code-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No sessions yet</Text>
              <Text style={styles.emptyHint}>Go to Session tab to start one</Text>
            </View>
          )}
          {mySessions?.slice(0, 10).map((s) => {
            const isActive = new Date(s.expiresAt) > new Date();
            return (
              <View key={s.id} style={styles.sessionCard}>
                <View style={[styles.sessionIcon, { backgroundColor: isActive ? Colors.accentPale : "#F8FAFC" }]}>
                  <Ionicons name="qr-code" size={20} color={isActive ? Colors.accent : Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionClass}>{s.className}</Text>
                  <Text style={styles.sessionTime}>
                    {new Date(s.expiresAt).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isActive ? Colors.successPale : "#F1F5F9" }]}>
                  <Text style={[styles.statusText, { color: isActive ? Colors.success : Colors.textMuted }]}>
                    {isActive ? "Active" : "Expired"}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.accent,
  },
  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.text,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  emptyHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  sessionCard: {
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
  sessionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sessionClass: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  sessionTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  logoutBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
  },
});
