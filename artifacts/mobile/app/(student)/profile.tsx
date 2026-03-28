import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface AttendanceRecord {
  id: string; sessionId: string; className: string; markedAt: string;
}
interface Session {
  id: string; className: string; createdAt: string;
}

const RING_SIZE = 180;
const RING_THICKNESS = 16;

function CircleRing({ percent }: { percent: number }) {
  const clamp = Math.max(0, Math.min(100, percent));
  const color = clamp >= 75 ? Colors.success : clamp >= 50 ? Colors.warning : Colors.error;

  const deg = (clamp / 100) * 360;
  const rightDeg = Math.min(deg, 180);
  const leftDeg = Math.max(deg - 180, 0);

  return (
    <View style={[styles.ringWrap, { width: RING_SIZE, height: RING_SIZE }]}>
      <View style={[styles.ringBase, { borderColor: color + "25" }]} />

      <View style={[styles.ringHalfMask, { left: RING_SIZE / 2 }]}>
        <View
          style={[
            styles.ringHalf,
            { borderColor: color, transform: [{ rotate: `${rightDeg}deg` }] },
          ]}
        />
      </View>

      {clamp > 50 && (
        <View style={[styles.ringHalfMask, { right: RING_SIZE / 2, left: 0, overflow: "hidden" }]}>
          <View
            style={[
              styles.ringHalf,
              {
                borderColor: color,
                left: 0,
                right: undefined,
                borderRightColor: "transparent",
                borderLeftWidth: RING_THICKNESS,
                borderRightWidth: 0,
                transform: [{ rotate: `${-180 + leftDeg}deg` }],
              },
            ]}
          />
        </View>
      )}

      <View style={styles.ringCenter}>
        <Text style={[styles.ringPct, { color }]}>{clamp}%</Text>
        <Text style={styles.ringLabel}>Attendance</Text>
      </View>
    </View>
  );
}

function StatusBadge({ percent }: { percent: number }) {
  if (percent >= 75) return <Badge label="Excellent" color={Colors.success} icon="trophy-outline" />;
  if (percent >= 60) return <Badge label="Good" color={Colors.warning} icon="thumbs-up-outline" />;
  if (percent >= 50) return <Badge label="Average" color="#F97316" icon="alert-circle-outline" />;
  return <Badge label="Low — Needs Improvement" color={Colors.error} icon="warning-outline" />;
}

function Badge({ label, color, icon }: { label: string; color: string; icon: any }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const { data: myRecords, isLoading: loadingRecords } = useQuery({
    queryKey: ["student-attendance"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/attendance/my"), { credentials: "include" });
      return res.json() as Promise<AttendanceRecord[]>;
    },
    refetchInterval: 15000,
  });

  const { data: classSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["class-sessions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/sessions/class"), { credentials: "include" });
      return res.json() as Promise<Session[]>;
    },
    refetchInterval: 15000,
  });

  const attended = myRecords?.length ?? 0;
  const total = classSessions?.length ?? 0;
  const absent = Math.max(0, total - attended);
  const percent = total > 0 ? Math.round((attended / total) * 100) : 0;

  const monthlyStats = useMemo(() => {
    if (!myRecords) return [];
    const map: Record<string, number> = {};
    for (const r of myRecords) {
      const key = new Date(r.markedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map).map(([month, count]) => ({ month, count })).reverse();
  }, [myRecords]);

  const recentSessions = useMemo(() => {
    if (!myRecords) return [];
    return [...myRecords].slice(0, 10);
  }, [myRecords]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const isLoading = loadingRecords || loadingSessions;

  const initials = (user?.name ?? "S")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.hero, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 16 }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heroName}>{user?.name ?? "Student"}</Text>
        <View style={styles.heroBadges}>
          {user?.className && (
            <View style={styles.heroBadge}>
              <Ionicons name="layers-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroBadgeText}>{user.className}</Text>
            </View>
          )}
          {user?.department && (
            <View style={styles.heroBadge}>
              <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroBadgeText}>{user.department}</Text>
            </View>
          )}
          {user?.email && (
            <View style={styles.heroBadge}>
              <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroBadgeText}>{user.email}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }}>
          <View style={styles.ringSection}>
            <CircleRing percent={percent} />
            <StatusBadge percent={percent} />
            {total === 0 && (
              <Text style={styles.noSessionsHint}>No sessions recorded for your class yet.</Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Attended" value={attended} icon="checkmark-circle-outline" color={Colors.success} />
            <StatCard label="Total" value={total} icon="calendar-outline" color={Colors.accent} />
            <StatCard label="Absent" value={absent} icon="close-circle-outline" color={Colors.error} />
          </View>

          {monthlyStats.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
              {monthlyStats.map(({ month, count }) => {
                const monthTotal = classSessions?.filter((s) => {
                  const key = new Date(s.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                  return key === month;
                }).length ?? 1;
                const pct = Math.round((count / monthTotal) * 100);
                const barColor = pct >= 75 ? Colors.success : pct >= 50 ? Colors.warning : Colors.error;
                return (
                  <View key={month} style={styles.monthRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.monthTop}>
                        <Text style={styles.monthName}>{month}</Text>
                        <Text style={[styles.monthPct, { color: barColor }]}>{pct}%</Text>
                      </View>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={styles.monthCount}>{count} of {monthTotal} sessions</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {recentSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Attendance</Text>
              {recentSessions.map((r) => (
                <View key={r.id} style={styles.recordRow}>
                  <View style={styles.recordDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordClass}>{r.className}</Text>
                    <Text style={styles.recordDate}>
                      {new Date(r.markedAt).toLocaleDateString("en-IN", {
                        weekday: "short", day: "numeric", month: "short", year: "numeric",
                      })}
                      {" · "}
                      {new Date(r.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <View style={styles.presentPill}>
                    <Text style={styles.presentPillText}>Present</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {recentSessions.length === 0 && !isLoading && (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No attendance yet</Text>
              <Text style={styles.emptyHint}>Scan your teacher's QR code to mark attendance</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  avatarWrap: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.white },
  logoutBtn: {
    padding: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
  },
  heroName: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white, marginBottom: 10 },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.9)" },

  ringSection: { alignItems: "center", paddingVertical: 28, gap: 14 },
  ringWrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  ringBase: {
    position: "absolute",
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_THICKNESS,
  },
  ringHalfMask: {
    position: "absolute",
    top: 0, bottom: 0,
    right: 0,
    width: RING_SIZE / 2,
    overflow: "hidden",
  },
  ringHalf: {
    position: "absolute",
    top: 0, left: undefined, right: 0,
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_THICKNESS,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    borderRightWidth: RING_THICKNESS,
    borderTopWidth: RING_THICKNESS,
    transformOrigin: `${RING_SIZE / 2}px ${RING_SIZE / 2}px`,
  },
  ringCenter: { alignItems: "center" },
  ringPct: { fontFamily: "Inter_700Bold", fontSize: 36 },
  ringLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7,
  },
  statusBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  noSessionsHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },

  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14,
    padding: 14, alignItems: "center", gap: 6,
    borderTopWidth: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },

  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text,
    marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5,
  },

  monthRow: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  monthTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  monthName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  monthPct: { fontFamily: "Inter_700Bold", fontSize: 14 },
  barBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  barFill: { height: 8, borderRadius: 4 },
  monthCount: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  recordRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.card, borderRadius: 13, padding: 13, marginBottom: 8,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  recordClass: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  recordDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  presentPill: { backgroundColor: Colors.successPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  presentPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.success },

  empty: { alignItems: "center", marginTop: 40, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  emptyHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
});
