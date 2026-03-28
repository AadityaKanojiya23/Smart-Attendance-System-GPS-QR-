import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { GradientHeader } from "@/components/GradientHeader";
import { Colors } from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface User { id: string; name: string; email: string; role: string; className?: string; }

export default function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/users"), { credentials: "include" });
      return res.json() as Promise<User[]>;
    },
  });

  const students = users?.filter((u) => u.role === "student") ?? [];

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Students"
        subtitle={`${students.length} enrolled`}
      />
      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.className && (
                  <View style={styles.classBadge}>
                    <Text style={styles.classBadgeText}>{item.className}</Text>
                  </View>
                )}
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Student</Text>
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
  empty: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textMuted },
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.accent },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
  email: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  classBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.accentPale,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  classBadgeText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.accent },
  roleBadge: {
    backgroundColor: Colors.successPale,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.success },
});
