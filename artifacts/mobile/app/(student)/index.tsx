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
  subject?: string;
  lectureStart?: string;
  lectureEnd?: string;
  teacherName?: string;
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

  const { data: classSessions } = useQuery({
    queryKey: ["student-class-sessions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/sessions/class"), { credentials: "include" });
      return res.json() as Promise<Session[]>;
    },
    refetchInterval: 10000,
  });

  const safeClassSessions = Array.isArray(classSessions) ? classSessions : [];
  const safeRecords = Array.isArray(records) ? records : [];
  const totalSessions = safeClassSessions.length;
  const classesAbsent = Math.max(0, totalSessions - safeRecords.length);

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
          data={safeRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, classesAbsent > 0 && { color: Colors.error }]}>
                  {classesAbsent}
                </Text>
                <Text style={styles.summaryLabel}>Classes Absent</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{safeRecords.length}</Text>
                <Text style={styles.summaryLabel}>Classes Attended</Text>
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
              <View style={styles.cardIconWrap}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                {/* Subject row */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardSubject} numberOfLines={1}>
                    {item.subject ?? item.className}
                  </Text>
                  <View style={styles.presentBadge}>
                    <Text style={styles.presentBadgeText}>Present</Text>
                  </View>
                </View>

                {/* Class + teacher */}
                <Text style={styles.cardClass}>{item.className}{item.teacherName ? ` · ${item.teacherName}` : ""}</Text>

                {/* Lecture timing */}
                {(item.lectureStart || item.lectureEnd) ? (
                  <View style={styles.cardTimeRow}>
                    <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.cardTimeText}>
                      {item.lectureStart ?? ""}{item.lectureStart && item.lectureEnd ? " – " : ""}{item.lectureEnd ?? ""}
                    </Text>
                  </View>
                ) : null}

                {/* Date marked */}
                <View style={styles.cardTimeRow}>
                  <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.cardTimeText}>
                    {new Date(item.markedAt).toLocaleDateString("en-IN", {
                      weekday: "short", day: "numeric", month: "short", year: "numeric",
                    })}{" · "}{new Date(item.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
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
    alignItems: "flex-start",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.successPale,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardSubject: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, flex: 1 },
  cardClass: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  cardTimeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  cardTimeText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  presentBadge: {
    backgroundColor: Colors.successPale,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  presentBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.success },
});
