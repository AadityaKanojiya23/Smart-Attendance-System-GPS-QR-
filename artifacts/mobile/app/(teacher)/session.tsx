import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { GradientHeader } from "@/components/GradientHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { CAMPUS_LAT, CAMPUS_LNG } from "@/lib/haversine";

type SessionState = "idle" | "generating" | "active" | "expired";

const SESSION_DURATION = 60;

export default function TeacherSessionScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const qc = useQueryClient();

  const [state, setState] = useState<SessionState>("idle");
  const [qrToken, setQrToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    if (state === "active") pulse.start();
    return () => pulse.stop();
  }, [state]);

  async function startSession() {
    setState("generating");
    setError("");
    try {
      let lat = CAMPUS_LAT;
      let lng = CAMPUS_LNG;
      if (Platform.OS !== "web") {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await Location.getCurrentPositionAsync({});
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch {}
      }

      const token = `SESSION_${user!.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000).toISOString();

      await apiRequest("POST", "/sessions", {
        teacherId: user!.id,
        className: user!.className ?? "CS-A",
        latitude: lat,
        longitude: lng,
        qrToken: token,
        expiresAt,
      });

      setQrToken(token);
      setTimeLeft(SESSION_DURATION);
      setState("active");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["teacher-sessions"] });

      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: SESSION_DURATION * 1000,
        useNativeDriver: false,
      }).start();

      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setState("expired");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e?.message || "Failed to start session");
      setState("idle");
    }
  }

  function resetSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    setQrToken("");
    setTimeLeft(SESSION_DURATION);
    setState("idle");
    setError("");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const pct = timeLeft / SESSION_DURATION;
  const ringColor = timeLeft > 30 ? Colors.success : timeLeft > 10 ? Colors.warning : Colors.error;

  return (
    <View style={styles.screen}>
      <GradientHeader
        title="Attendance Session"
        subtitle={`Class: ${user?.className ?? "CS-A"}`}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
        {state === "idle" && (
          <View style={styles.idleContainer}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How it works</Text>
              {[
                { icon: "locate-outline" as const, text: "Your GPS location is captured" },
                { icon: "qr-code-outline" as const, text: "A unique QR code is generated" },
                { icon: "timer-outline" as const, text: "Students scan within 60 seconds" },
                { icon: "checkmark-circle-outline" as const, text: "Attendance is auto-recorded" },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons name={item.icon} size={18} color={Colors.accent} />
                  </View>
                  <Text style={styles.infoText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.startBtn}
              onPress={startSession}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.primaryDark, Colors.accent]}
                style={styles.startBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="qr-code-outline" size={22} color={Colors.white} />
                <Text style={styles.startBtnText}>Start Attendance Session</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {state === "generating" && (
          <View style={styles.centerContent}>
            <View style={styles.generatingIcon}>
              <Ionicons name="sync-outline" size={40} color={Colors.accent} />
            </View>
            <Text style={styles.generatingText}>Capturing GPS & Generating QR...</Text>
          </View>
        )}

        {state === "active" && (
          <View style={styles.activeContainer}>
            <View style={styles.timerRow}>
              <View style={[styles.timerBadge, { backgroundColor: ringColor + "18" }]}>
                <Ionicons name="timer-outline" size={18} color={ringColor} />
                <Text style={[styles.timerText, { color: ringColor }]}>{timeLeft}s</Text>
              </View>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[styles.progressBarFill, {
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                    backgroundColor: ringColor,
                  }]}
                />
              </View>
            </View>

            <Text style={styles.scanLabel}>Students can scan this QR</Text>

            <Animated.View style={[styles.qrCard, { transform: [{ scale: pulseAnim }] }]}>
              <QRCode
                value={qrToken}
                size={220}
                color={Colors.primaryDark}
                backgroundColor={Colors.white}
              />
            </Animated.View>

            <View style={styles.sessionMeta}>
              <Ionicons name="school-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.sessionMetaText}>Class {user?.className ?? "CS-A"}</Text>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.sessionMetaText}>GPS Active</Text>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={resetSession}>
              <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
              <Text style={styles.cancelBtnText}>Cancel Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === "expired" && (
          <View style={styles.expiredContainer}>
            <View style={styles.expiredIcon}>
              <Ionicons name="time-outline" size={52} color={Colors.warning} />
            </View>
            <Text style={styles.expiredTitle}>Session Expired</Text>
            <Text style={styles.expiredSubtitle}>The 60-second window has closed.</Text>

            <TouchableOpacity style={styles.newSessionBtn} onPress={resetSession} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={20} color={Colors.white} />
              <Text style={styles.newSessionBtnText}>Start New Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  idleContainer: { gap: 16 },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  infoTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, flex: 1 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.error, flex: 1 },
  startBtn: { borderRadius: 16, overflow: "hidden" },
  startBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  startBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.white },
  centerContent: { alignItems: "center", marginTop: 60, gap: 16 },
  generatingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  generatingText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  activeContainer: { alignItems: "center", gap: 16 },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  scanLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
  },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sessionMetaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dot: { color: Colors.textMuted },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.error },
  expiredContainer: { alignItems: "center", marginTop: 40, gap: 16, paddingHorizontal: 24 },
  expiredIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  expiredTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  expiredSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  newSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  newSessionBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },
});
