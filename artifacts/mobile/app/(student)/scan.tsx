import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { GradientHeader } from "@/components/GradientHeader";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

type ScanState = "idle" | "scanning" | "processing" | "success" | "already_marked" | "error";

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const scannedTokens = useRef<Set<string>>(new Set());
  const isProcessing = useRef(false);

  async function openScanner() {
    if (Platform.OS === "web") {
      setErrorMsg("Camera scanning is not available on web. Please use the mobile app.");
      setScanState("error");
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setErrorMsg("Camera permission is required to scan QR codes.");
        setScanState("error");
        return;
      }
    }
    setScanState("scanning");
    isProcessing.current = false;
  }

  async function handleScan({ data }: { data: string }) {
    if (isProcessing.current) return;
    if (!data.startsWith("SESSION_")) return;

    isProcessing.current = true;

    if (scannedTokens.current.has(data)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setScanState("already_marked");
      setTimeout(() => {
        setScanState("scanning");
        isProcessing.current = false;
      }, 2500);
      return;
    }

    setScanState("processing");

    try {
      let lat: number | undefined;
      let lng: number | undefined;
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

      if (lat == null || lng == null) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrorMsg("Could not get your location. Please enable GPS and try again.");
        setScanState("error");
        isProcessing.current = false;
        return;
      }

      await apiRequest("POST", "/attendance", { qrToken: data, latitude: lat, longitude: lng });

      scannedTokens.current.add(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScanState("success");
      qc.invalidateQueries({ queryKey: ["student-attendance"] });

      setTimeout(() => {
        setScanState("scanning");
        isProcessing.current = false;
      }, 2500);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(e?.message || "Failed to mark attendance.");
      setScanState("error");
    }
  }

  function goBackToIdle() {
    setScanState("idle");
    setErrorMsg("");
    isProcessing.current = false;
  }

  return (
    <View style={styles.screen}>
      <GradientHeader title="Scan QR Code" subtitle="Mark your attendance" />

      {scanState === "scanning" || scanState === "processing" || scanState === "success" || scanState === "already_marked" ? (
        <View style={styles.cameraContainer}>
          {Platform.OS !== "web" && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanState === "scanning" ? handleScan : undefined}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
          )}
          <View style={styles.cameraOverlay}>
            <View style={styles.frameOuter}>
              <View style={styles.frameBracketTL} />
              <View style={styles.frameBracketTR} />
              <View style={styles.frameBracketBL} />
              <View style={styles.frameBracketBR} />
              {scanState === "processing" && (
                <ActivityIndicator color={Colors.white} size="large" />
              )}
              {scanState === "success" && (
                <View style={styles.resultCircle}>
                  <Ionicons name="checkmark" size={48} color={Colors.white} />
                </View>
              )}
              {scanState === "already_marked" && (
                <View style={[styles.resultCircle, { backgroundColor: Colors.warning }]}>
                  <Ionicons name="warning" size={40} color={Colors.white} />
                </View>
              )}
            </View>

            <Text style={styles.cameraHint}>
              {scanState === "scanning" ? "Point camera at the teacher's QR code" :
               scanState === "processing" ? "Verifying attendance..." :
               scanState === "success" ? "Attendance Marked!" :
               "Already Marked!"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.cameraBackBtn, { top: (Platform.OS === "web" ? 67 : insets.top) + 10 }]}
            onPress={goBackToIdle}
          >
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
          {scanState === "idle" && (
            <>
              <View style={styles.reqCard}>
                <Text style={styles.reqTitle}>Requirements</Text>
                {[
                  { icon: "qr-code-outline" as const, text: "Point your camera at the teacher's QR code" },
                  { icon: "location-outline" as const, text: "You must be within 200m of the class" },
                  { icon: "timer-outline" as const, text: "Scan within the QR validity window" },
                  { icon: "school-outline" as const, text: "Your class must match the session" },
                ].map((r, i) => (
                  <View key={i} style={styles.reqRow}>
                    <View style={styles.reqIconWrap}>
                      <Ionicons name={r.icon} size={18} color={Colors.accent} />
                    </View>
                    <Text style={styles.reqText}>{r.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.openScanBtn} onPress={openScanner} activeOpacity={0.85}>
                <LinearGradient
                  colors={[Colors.primaryDark, Colors.accent]}
                  style={styles.openScanBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="scan-outline" size={22} color={Colors.white} />
                  <Text style={styles.openScanBtnText}>Open Scanner</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {scanState === "error" && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="close-circle" size={56} color={Colors.error} />
              </View>
              <Text style={styles.errorTitle}>Scan Failed</Text>
              <Text style={styles.errorMsg}>{errorMsg}</Text>
              <View style={styles.errorBtns}>
                <TouchableOpacity
                  style={[styles.errorBtn, { backgroundColor: Colors.accent }]}
                  onPress={() => { setErrorMsg(""); setScanState("scanning"); }}
                >
                  <Ionicons name="refresh-outline" size={18} color={Colors.white} />
                  <Text style={styles.errorBtnText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.errorBtn, { backgroundColor: "#F1F5F9" }]}
                  onPress={goBackToIdle}
                >
                  <Ionicons name="arrow-back-outline" size={18} color={Colors.text} />
                  <Text style={[styles.errorBtnText, { color: Colors.text }]}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const BRACKET = 28;
const BORDER = 3;
const FRAME = 220;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  cameraContainer: { flex: 1, position: "relative", backgroundColor: "#000" },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  frameOuter: {
    width: FRAME,
    height: FRAME,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  frameBracketTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BRACKET,
    height: BRACKET,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
    borderColor: Colors.white,
    borderTopLeftRadius: 6,
  },
  frameBracketTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: BRACKET,
    height: BRACKET,
    borderTopWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: Colors.white,
    borderTopRightRadius: 6,
  },
  frameBracketBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: BRACKET,
    height: BRACKET,
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderColor: Colors.white,
    borderBottomLeftRadius: 6,
  },
  frameBracketBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: BRACKET,
    height: BRACKET,
    borderBottomWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: Colors.white,
    borderBottomRightRadius: 6,
  },
  resultCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraHint: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  cameraBackBtn: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  reqCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  reqTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 14,
  },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  reqIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.accentPale,
    alignItems: "center",
    justifyContent: "center",
  },
  reqText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, flex: 1 },
  openScanBtn: { borderRadius: 16, overflow: "hidden" },
  openScanBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  openScanBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.white },
  errorContainer: {
    alignItems: "center",
    marginTop: 32,
    gap: 12,
    paddingHorizontal: 16,
  },
  errorIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text },
  errorMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  errorBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  errorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 14,
  },
  errorBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
});
