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
import { useAuth, type TeacherAssignment } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { CAMPUS_LAT, CAMPUS_LNG } from "@/lib/haversine";

type SessionState = "idle" | "setup" | "generating" | "active" | "expired";

const QR_DURATION_OPTIONS = [1, 2, 5, 10, 15, 30];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function roundTo5(m: number) {
  return Math.round(m / 5) * 5 % 60;
}

function TimeSpinner({
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  label: string;
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
  const stepMin = (delta: number) => {
    const newM = ((minute + delta * 5) + 60) % 60;
    onMinuteChange(newM);
  };
  const stepHour = (delta: number) => {
    onHourChange(((hour + delta) + 24) % 24);
  };
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;

  return (
    <View style={tsStyles.wrap}>
      <Text style={tsStyles.label}>{label}</Text>
      <View style={tsStyles.spinners}>
        <View style={tsStyles.spinnerCol}>
          <TouchableOpacity onPress={() => stepHour(1)} style={tsStyles.arrow}>
            <Ionicons name="chevron-up" size={18} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={tsStyles.value}>{pad(h12)}</Text>
          <TouchableOpacity onPress={() => stepHour(-1)} style={tsStyles.arrow}>
            <Ionicons name="chevron-down" size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>
        <Text style={tsStyles.colon}>:</Text>
        <View style={tsStyles.spinnerCol}>
          <TouchableOpacity onPress={() => stepMin(1)} style={tsStyles.arrow}>
            <Ionicons name="chevron-up" size={18} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={tsStyles.value}>{pad(minute)}</Text>
          <TouchableOpacity onPress={() => stepMin(-1)} style={tsStyles.arrow}>
            <Ionicons name="chevron-down" size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>
        <Text style={tsStyles.ampm}>{ampm}</Text>
      </View>
    </View>
  );
}

const tsStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center" },
  label: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  spinners: { flexDirection: "row", alignItems: "center", gap: 4 },
  spinnerCol: { alignItems: "center", gap: 4 },
  arrow: { padding: 4, backgroundColor: Colors.accentPale, borderRadius: 8 },
  value: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, minWidth: 34, textAlign: "center" },
  colon: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginBottom: 6, paddingHorizontal: 2 },
  ampm: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary, alignSelf: "flex-end", marginBottom: 6, marginLeft: 2 },
});

export default function TeacherSessionScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const qc = useQueryClient();

  // Build assignments list: use teacher.assignments[] if available, else construct from flat fields
  const assignments: TeacherAssignment[] = user?.assignments && user.assignments.length > 0
    ? user.assignments
    : (user?.year && user?.division
      ? [{
          className: user.className ?? "",
          departmentId: user.departmentId ?? "",
          departmentCode: user.className?.split("-")[0] ?? "CS",
          year: user.year,
          division: user.division,
          subjects: user.subjects ?? [],
        }]
      : []);

  // Available years from assignments (sorted)
  const availableYears = Array.from(new Set(assignments.map(a => a.year))).sort();

  const now = new Date();
  const defStartH = now.getHours();
  const defStartM = roundTo5(now.getMinutes());
  const defEndH = (defStartH + 1) % 24;
  const defEndM = defStartM;

  const [state, setState] = useState<SessionState>("idle");
  const [error, setError] = useState("");

  const [startH, setStartH] = useState(defStartH);
  const [startM, setStartM] = useState(defStartM);
  const [endH, setEndH] = useState(defEndH);
  const [endM, setEndM] = useState(defEndM);
  const [qrDurationMin, setQrDurationMin] = useState(5);
  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] ?? 1);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Divisions available for the selected year
  const availableDivisions = assignments
    .filter(a => a.year === selectedYear)
    .map(a => a.division)
    .sort();

  // Current assignment (year + division)
  const currentAssignment = assignments.find(
    a => a.year === selectedYear && a.division === selectedDivision
  );
  const subjects = currentAssignment?.subjects ?? [];
  const deptCode = currentAssignment?.departmentCode ?? user?.className?.split("-")[0] ?? "CS";

  const [qrToken, setQrToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const sessionDurationSecs = qrDurationMin * 60;

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

  function openSetup() {
    setError("");
    const n = new Date();
    setStartH(n.getHours());
    setStartM(roundTo5(n.getMinutes()));
    setEndH((n.getHours() + 1) % 24);
    setEndM(roundTo5(n.getMinutes()));
    // Auto-select first year and its first division
    const firstYear = availableYears[0] ?? 1;
    setSelectedYear(firstYear);
    const firstDivForYear = assignments.filter(a => a.year === firstYear).map(a => a.division).sort()[0] ?? "";
    setSelectedDivision(firstDivForYear);
    setSelectedSubject("");
    setState("setup");
  }

  function handleYearChange(y: number) {
    setSelectedYear(y);
    const divsForYear = assignments.filter(a => a.year === y).map(a => a.division).sort();
    setSelectedDivision(divsForYear[0] ?? "");
    setSelectedSubject("");
  }

  function handleDivisionChange(d: string) {
    setSelectedDivision(d);
    setSelectedSubject("");
  }

  async function startSession() {
    if (!selectedSubject) {
      setError("Please select a subject.");
      return;
    }
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
      const expiresAt = new Date(Date.now() + sessionDurationSecs * 1000).toISOString();
      const newClassName = `${deptCode}-Y${selectedYear}-${selectedDivision}`;

      await apiRequest("POST", "/sessions", {
        teacherId: user!.id,
        className: newClassName,
        latitude: lat,
        longitude: lng,
        qrToken: token,
        expiresAt,
        subject: selectedSubject,
        lectureStart: `${pad(startH)}:${pad(startM)}`,
        lectureEnd: `${pad(endH)}:${pad(endM)}`,
        durationSecs: sessionDurationSecs,
      });

      setQrToken(token);
      setTimeLeft(sessionDurationSecs);
      setState("active");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["teacher-sessions"] });

      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: sessionDurationSecs * 1000,
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
      setState("setup");
    }
  }

  function resetSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    setQrToken("");
    setTimeLeft(sessionDurationSecs);
    setState("idle");
    setError("");
    setSelectedSubject("");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const ringColor = timeLeft > sessionDurationSecs * 0.5 ? Colors.success : timeLeft > sessionDurationSecs * 0.15 ? Colors.warning : Colors.error;

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
                { icon: "locate-outline" as const,          text: "Your GPS location is captured" },
                { icon: "create-outline" as const,          text: "Set lecture timing, year, division & subject" },
                { icon: "qr-code-outline" as const,         text: "A unique QR code is generated" },
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

            <TouchableOpacity style={styles.startBtn} onPress={openSetup} activeOpacity={0.85}>
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

        {state === "setup" && (
          <View style={styles.setupContainer}>
            <Text style={styles.setupHeading}>Session Setup</Text>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="time-outline" size={18} color={Colors.accent} />
                <Text style={styles.cardTitle}>Set Lecture Timing</Text>
              </View>
              <View style={styles.timersRow}>
                <TimeSpinner
                  label="Start Time"
                  hour={startH}
                  minute={startM}
                  onHourChange={setStartH}
                  onMinuteChange={setStartM}
                />
                <View style={styles.timeDivider} />
                <TimeSpinner
                  label="End Time"
                  hour={endH}
                  minute={endM}
                  onHourChange={setEndH}
                  onMinuteChange={setEndM}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="timer-outline" size={18} color={Colors.accent} />
                <Text style={styles.cardTitle}>QR Valid Duration</Text>
              </View>
              <View style={styles.pillRow}>
                {QR_DURATION_OPTIONS.map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[styles.pill, qrDurationMin === min && styles.pillActive]}
                    onPress={() => setQrDurationMin(min)}
                  >
                    <Text style={[styles.pillText, qrDurationMin === min && styles.pillTextActive]}>
                      {min} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="school-outline" size={18} color={Colors.accent} />
                <Text style={styles.cardTitle}>Year & Division</Text>
              </View>
              {availableYears.length === 0 ? (
                <View style={styles.noSubjectsBox}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.noSubjectsText}>No classes assigned yet</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.subLabel}>Year</Text>
                  <View style={styles.pillRow}>
                    {availableYears.map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.pill, selectedYear === y && styles.pillActive]}
                        onPress={() => handleYearChange(y)}
                      >
                        <Text style={[styles.pillText, selectedYear === y && styles.pillTextActive]}>
                          {y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.subLabel, { marginTop: 14 }]}>Division</Text>
                  <View style={styles.pillRow}>
                    {availableDivisions.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.pill, styles.pillSm, selectedDivision === d && styles.pillActive]}
                        onPress={() => handleDivisionChange(d)}
                      >
                        <Text style={[styles.pillText, selectedDivision === d && styles.pillTextActive]}>Div {d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {selectedDivision ? (
                    <View style={styles.classPreviewRow}>
                      <Ionicons name="layers-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.classPreviewText}>
                        Class: {deptCode}-Y{selectedYear}-{selectedDivision}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="book-outline" size={18} color={Colors.accent} />
                <Text style={styles.cardTitle}>Select Subject</Text>
              </View>
              {subjects.length === 0 ? (
                <View style={styles.noSubjectsBox}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.noSubjectsText}>No subjects assigned to your profile</Text>
                </View>
              ) : (
                <View style={styles.subjectList}>
                  {subjects.map((subj) => (
                    <TouchableOpacity
                      key={subj}
                      style={[styles.subjectItem, selectedSubject === subj && styles.subjectItemActive]}
                      onPress={() => setSelectedSubject(subj)}
                    >
                      <View style={[styles.subjectDot, selectedSubject === subj && styles.subjectDotActive]}>
                        {selectedSubject === subj && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                      </View>
                      <Text style={[styles.subjectText, selectedSubject === subj && styles.subjectTextActive]}>
                        {subj}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.setupActions}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setState("idle")}>
                <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.launchBtn, (!selectedSubject || subjects.length === 0) && styles.launchBtnDisabled]}
                onPress={startSession}
                activeOpacity={0.85}
                disabled={!selectedSubject || subjects.length === 0}
              >
                <LinearGradient
                  colors={[Colors.primaryDark, Colors.accent]}
                  style={styles.launchBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="qr-code-outline" size={18} color={Colors.white} />
                  <Text style={styles.launchBtnText}>Generate QR</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
            <View style={styles.sessionInfoBanner}>
              <View style={styles.sessionInfoItem}>
                <Ionicons name="book-outline" size={13} color={Colors.accent} />
                <Text style={styles.sessionInfoText}>{selectedSubject}</Text>
              </View>
              <View style={styles.infoDot} />
              <View style={styles.sessionInfoItem}>
                <Ionicons name="school-outline" size={13} color={Colors.accent} />
                <Text style={styles.sessionInfoText}>{deptCode}-Y{selectedYear}-{selectedDivision}</Text>
              </View>
              <View style={styles.infoDot} />
              <View style={styles.sessionInfoItem}>
                <Ionicons name="time-outline" size={13} color={Colors.accent} />
                <Text style={styles.sessionInfoText}>{pad(startH)}:{pad(startM)} – {pad(endH)}:{pad(endM)}</Text>
              </View>
            </View>

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
            <Text style={styles.expiredSubtitle}>The QR window has closed.</Text>

            <View style={styles.expiredSummary}>
              {selectedSubject ? (
                <View style={styles.expiredRow}>
                  <Ionicons name="book-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.expiredRowText}>{selectedSubject}</Text>
                </View>
              ) : null}
              <View style={styles.expiredRow}>
                <Ionicons name="layers-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.expiredRowText}>{deptCode}-Y{selectedYear}-{selectedDivision}</Text>
              </View>
              <View style={styles.expiredRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.expiredRowText}>{pad(startH)}:{pad(startM)} – {pad(endH)}:{pad(endM)}</Text>
              </View>
            </View>

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
  infoTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  infoIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, flex: 1 },
  startBtn: { borderRadius: 16, overflow: "hidden" },
  startBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, paddingHorizontal: 28 },
  startBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.white },

  setupContainer: { gap: 14 },
  setupHeading: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.text, marginBottom: 2 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
  timersRow: { flexDirection: "row", alignItems: "center" },
  timeDivider: { width: 1, height: 70, backgroundColor: Colors.border, marginHorizontal: 12 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillSm: { paddingHorizontal: 12 },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
  subLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  classPreviewRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  classPreviewText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  subjectList: { gap: 8 },
  subjectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subjectItemActive: { backgroundColor: Colors.accentPale, borderColor: Colors.accent },
  subjectDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  subjectDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  subjectText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
  subjectTextActive: { fontFamily: "Inter_600SemiBold", color: Colors.accent },
  noSubjectsBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  noSubjectsText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.error, flex: 1 },
  setupActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  backBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textSecondary },
  launchBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  launchBtnDisabled: { opacity: 0.5 },
  launchBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  launchBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white },

  centerContent: { alignItems: "center", marginTop: 60, gap: 16 },
  generatingIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentPale, alignItems: "center", justifyContent: "center" },
  generatingText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },

  activeContainer: { alignItems: "center", gap: 16 },
  sessionInfoBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    width: "100%",
  },
  sessionInfoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  sessionInfoText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.text },
  infoDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.border },
  timerRow: { flexDirection: "row", alignItems: "center", width: "100%", gap: 12 },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 4 },
  scanLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.text, textAlign: "center" },
  qrCard: { backgroundColor: Colors.white, borderRadius: 24, padding: 24, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  sessionMetaText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: "#FEE2E2" },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.error },

  expiredContainer: { alignItems: "center", marginTop: 40, gap: 16, paddingHorizontal: 24 },
  expiredIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  expiredTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.text },
  expiredSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  expiredSummary: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, width: "100%", gap: 10 },
  expiredRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  expiredRowText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.text },
  newSessionBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 8 },
  newSessionBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },
});
