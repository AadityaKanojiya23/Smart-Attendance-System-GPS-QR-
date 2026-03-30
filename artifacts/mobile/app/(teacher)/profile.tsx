import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
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
import { GradientHeader } from "@/components/GradientHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface Session {
  id: string;
  teacherId: string;
  className: string;
  expiresAt: string;
}

export default function TeacherProfile() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const { data: mySessions, isLoading } = useQuery({
    queryKey: ["teacher-sessions-profile"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/sessions/my"), { credentials: "include" });
      return res.json() as Promise<Session[]>;
    },
  });

  // Calculate unique divisions from classes
  const divisions = Array.from(
    new Set(
      (mySessions ?? []).map((s) => {
        const parts = s.className.split("-");
        return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : s.className;
      })
    )
  );

  const subjects = user?.subjects ?? [];

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="My Profile"
        subtitle="Teacher Details"
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
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{user?.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              {user?.className && <Text style={styles.profileClass}>{user.className}</Text>}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{divisions.length}</Text>
              <Text style={styles.statLabel}>Divisions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{subjects.length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{mySessions?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>

          {divisions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Divisions Assigned</Text>
              <View style={styles.divisionsWrap}>
                {divisions.map((div, i) => (
                  <View key={i} style={styles.divisionTag}>
                    <Ionicons name="layers-outline" size={14} color={Colors.accent} />
                    <Text style={styles.divisionTagText}>{div}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {subjects.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Subjects Taught</Text>
              <View style={styles.subjectsWrap}>
                {subjects.map((subj, i) => (
                  <View key={i} style={styles.subjectTag}>
                    <Ionicons name="book-outline" size={14} color={Colors.white} />
                    <Text style={styles.subjectTagText}>{subj}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={Colors.accent} />
                <Text style={styles.infoText}>{user?.email}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name="id-card-outline" size={18} color={Colors.accent} />
                <Text style={styles.infoText}>{user?.id}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  logoutBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
  },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  profileAvatar: { width: 70, height: 70, borderRadius: 16, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.accent },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.text },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  profileClass: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.accent, marginTop: 4 },
  statsGrid: { flexDirection: "row", gap: 10, marginVertical: 20 },
  statBox: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.accent },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginVertical: 12 },
  divisionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  divisionTag: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  divisionTagText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.text, marginLeft: 6 },
  subjectsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  subjectTag: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  subjectTagText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.white, marginLeft: 6 },
  infoSection: { marginTop: 8 },
  infoCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text, flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
});
