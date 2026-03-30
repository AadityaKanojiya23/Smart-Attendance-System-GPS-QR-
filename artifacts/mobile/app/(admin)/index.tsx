import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { GradientHeader } from "@/components/GradientHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface User { id: string; name: string; email: string; role: string; department?: string; className?: string; }
interface Department { id: string; name: string; code: string; }
interface Session { id: string; teacherId: string; className: string; expiresAt: string; }
interface AttendanceRecord { id: string; studentId: string; studentName: string; sessionId: string; className: string; markedAt: string; }

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const [searchQuery, setSearchQuery] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/departments"), { credentials: "include" });
      return res.json() as Promise<Department[]>;
    },
  });

  const { data: users, isLoading: loadUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/users"), { credentials: "include" });
      return res.json() as Promise<User[]>;
    },
  });

  const { data: sessions, isLoading: loadSessions } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/sessions/active"), { credentials: "include" });
      return res.json() as Promise<Session[]>;
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["admin-attendance"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/attendance"), { credentials: "include" });
      return res.json() as Promise<AttendanceRecord[]>;
    },
  });

  const allStudents = users?.filter((u) => u.role === "student") ?? [];
  const allTeachers = users?.filter((u) => u.role === "teacher") ?? [];
  
  const filteredStudents = searchQuery.trim() 
    ? allStudents.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allStudents;
  const filteredTeachers = searchQuery.trim()
    ? allTeachers.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allTeachers;
  
  const students = searchQuery.trim() ? filteredStudents : allStudents;
  const teachers = searchQuery.trim() ? filteredTeachers : allTeachers;
  const totalAttendance = attendance?.length ?? 0;
  const attendanceRate =
    students.length > 0 && totalAttendance > 0
      ? Math.round((totalAttendance / (students.length * Math.max((sessions?.length ?? 1), 1))) * 100)
      : 0;
  const deptCount = departments?.length ?? 0;

  const loading = loadUsers || loadSessions;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Admin Dashboard"
        subtitle={`Welcome, ${user?.name ?? "Admin"}`}
        right={
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        }
      />
      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search teacher or student by name..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <StatCard label="Departments" value={deptCount} icon="business-outline" color="#8B5CF6" />
            <View style={{ width: 12 }} />
            <StatCard label="Teachers" value={teachers.length} icon="school-outline" color={Colors.warning} />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Students" value={students.length} icon="people-outline" color={Colors.accent} />
            <View style={{ width: 12 }} />
            <StatCard label="Attend. Rate" value={`${attendanceRate}%`} icon="bar-chart-outline" color={Colors.success} />
          </View>

          <Text style={styles.sectionTitle}>Active Sessions</Text>
          {sessions?.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No active sessions</Text>
            </View>
          )}
          {sessions?.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.sessionIconWrap}>
                <Ionicons name="qr-code" size={22} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionClass}>{s.className}</Text>
                <Text style={styles.sessionExpiry}>
                  Expires {new Date(s.expiresAt).toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  statsRow: { flexDirection: "row", marginBottom: 0 },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
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
  sessionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sessionClass: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  sessionExpiry: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  activeBadge: {
    backgroundColor: Colors.successPale,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.success },
  logoutBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
  },
});
