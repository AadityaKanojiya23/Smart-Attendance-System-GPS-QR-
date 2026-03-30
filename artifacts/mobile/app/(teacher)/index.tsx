import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  function openSessionDetails(session: Session) {
    setSelectedSession(session);
    setShowModal(true);
  }

  const { data: sessionAttendanceData } = useQuery({
    queryKey: ["session-attendance", selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession?.id) return [];
      const res = await fetch(getApiUrl(`/sessions/${selectedSession.id}/attendance`), {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json() as Promise<AttendanceRecord[]>;
    },
    enabled: !!selectedSession?.id,
  });

  function getSessionAttendance(sessionId: string) {
    return sessionAttendanceData ?? [];
  }

  async function removeAttendance(recordId: string) {
    try {
      const res = await fetch(getApiUrl(`/attendance/${recordId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        // Refetch attendance
        (window as any).location.reload();
      }
    } catch (e) {
      console.error("Error removing attendance", e);
    }
  }

  async function blockStudent(sessionId: string, studentId: string) {
    try {
      const res = await fetch(getApiUrl(`/sessions/${sessionId}/block/${studentId}`), {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        // Refetch attendance
        (window as any).location.reload();
      }
    } catch (e) {
      console.error("Error blocking student", e);
    }
  }

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
            const sessionAttendance = getSessionAttendance(s.id);
            return (
              <TouchableOpacity key={s.id} style={styles.sessionCard} onPress={() => openSessionDetails(s)}>
                <View style={[styles.sessionIcon, { backgroundColor: isActive ? Colors.accentPale : "#F8FAFC" }]}>
                  <Ionicons name="qr-code" size={20} color={isActive ? Colors.accent : Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionClass}>{s.className}</Text>
                  <Text style={styles.sessionTime}>
                    {new Date(s.expiresAt).toLocaleString()}
                  </Text>
                  <Text style={styles.sessionAttendance}>Tap to view attendance</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isActive ? Colors.successPale : "#F1F5F9" }]}>
                  <Text style={[styles.statusText, { color: isActive ? Colors.success : Colors.textMuted }]}>
                    {isActive ? "Active" : "Expired"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
        <View style={[styles.modalWrap, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
          <View style={styles.modalHandle} />
          {selectedSession && (
            <ScrollView contentContainerStyle={{ gap: 16 }}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionAvatar}>
                  <Ionicons name="qr-code" size={24} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionHeaderClass}>{selectedSession.className}</Text>
                  <Text style={styles.sessionHeaderTime}>
                    {new Date(selectedSession.expiresAt).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.attendanceStats}>
                <Text style={styles.statsLabel}>Students Marked</Text>
                <Text style={styles.statsValue}>{getSessionAttendance(selectedSession.id).length}</Text>
              </View>

              <Text style={styles.listTitle}>Attendance List</Text>
              {getSessionAttendance(selectedSession.id).length === 0 ? (
                <View style={styles.emptyAttendance}>
                  <Ionicons name="person-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyAttendanceText}>No attendance records yet</Text>
                </View>
              ) : (
                <View>
                  {getSessionAttendance(selectedSession.id).map((record, idx) => (
                    <View key={record.id} style={[styles.attendanceItem, idx === getSessionAttendance(selectedSession.id).length - 1 && { marginBottom: 0 }]}>
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>{record.studentName[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{record.studentName}</Text>
                        <Text style={styles.markedTime}>
                          {new Date(record.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => removeAttendance(record.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => blockStudent(selectedSession.id, record.studentId)}
                        >
                          <Ionicons name="ban" size={18} color={Colors.warning} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
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
  sessionAttendance: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.accent, marginTop: 4 },
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
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalWrap: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, maxHeight: "90%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 16 },
  sessionHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sessionAvatar: { width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  sessionHeaderClass: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  sessionHeaderTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  attendanceStats: { backgroundColor: Colors.background, borderRadius: 14, padding: 16, alignItems: "center" },
  statsLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  statsValue: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.accent, marginTop: 4 },
  listTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
  emptyAttendance: { backgroundColor: Colors.background, borderRadius: 14, paddingVertical: 32, alignItems: "center", gap: 8 },
  emptyAttendanceText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  attendanceItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  studentAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center", marginRight: 10 },
  studentAvatarText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
  studentName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
  markedTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  actionButtons: { flexDirection: "row", gap: 6, marginLeft: 8 },
  actionBtn: { padding: 6 },
  closeBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },
});
