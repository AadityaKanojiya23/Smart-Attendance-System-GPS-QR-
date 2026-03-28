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

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  className: string;
  markedAt: string;
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const { data: records, isLoading } = useQuery({
    queryKey: ["admin-attendance"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/attendance"), { credentials: "include" });
      return res.json() as Promise<AttendanceRecord[]>;
    },
  });

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Reports"
        subtitle={`${records?.length ?? 0} attendance records`}
      />
      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={records ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No attendance records yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.studentName?.[0]?.toUpperCase() ?? "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.studentName}</Text>
                <Text style={styles.meta}>Class: {item.className}</Text>
                <Text style={styles.time}>
                  {new Date(item.markedAt).toLocaleDateString()} {new Date(item.markedAt).toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.badgeText}>Present</Text>
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
  meta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  time: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4 },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.success },
});
