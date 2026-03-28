import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import {
  CAMPUS_LAT,
  CAMPUS_LNG,
  CAMPUS_RADIUS_M,
  haversineDistance,
} from "@/lib/haversine";

type GpsState = "checking" | "inside" | "outside" | "error";

export default function GpsGateScreen() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [gpsState, setGpsState] = useState<GpsState>("checking");
  const [distance, setDistance] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (!loading) checkLocation();
  }, [loading]);

  async function checkLocation() {
    setGpsState("checking");
    try {
      if (Platform.OS === "web") {
        navigator.geolocation.getCurrentPosition(
          (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude),
          () => setGpsState("error")
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsState("error");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      handlePosition(loc.coords.latitude, loc.coords.longitude);
    } catch {
      setGpsState("error");
    }
  }

  function handlePosition(lat: number, lng: number) {
    const dist = haversineDistance(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
    setDistance(Math.round(dist));
    if (dist <= CAMPUS_RADIUS_M) {
      setGpsState("inside");
      navigateByRole();
    } else {
      setGpsState("outside");
    }
  }

  function navigateByRole() {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "admin") router.replace("/(admin)/");
    else if (user.role === "teacher") router.replace("/(teacher)/");
    else router.replace("/(student)/");
  }

  function skipGps() {
    navigateByRole();
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={styles.full}
      >
        <ActivityIndicator color={Colors.white} size="large" />
      </LinearGradient>
    );
  }

  const isChecking = gpsState === "checking";
  const isInside = gpsState === "inside";
  const isOutside = gpsState === "outside";
  const isError = gpsState === "error";

  const iconName: keyof typeof Ionicons.glyphMap =
    isInside ? "checkmark-circle" : isOutside ? "location-outline" : isError ? "warning-outline" : "locate";
  const iconColor =
    isInside ? Colors.success : isOutside ? Colors.warning : isError ? Colors.error : Colors.white;

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary]}
      style={[styles.full, { paddingTop: topPad, paddingBottom: bottomPad }]}
    >
      <View style={styles.content}>
        <View style={styles.campusLabel}>
          <Ionicons name="school-outline" size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.campusName}>K.C. College of Engineering</Text>
        </View>

        <Animated.View style={[styles.iconCircle, { transform: [{ scale: isChecking ? pulseAnim : 1 }] }]}>
          {isChecking ? (
            <ActivityIndicator color={Colors.white} size="large" />
          ) : (
            <Ionicons name={iconName} size={56} color={iconColor} />
          )}
        </Animated.View>

        <Text style={styles.statusTitle}>
          {isChecking
            ? "Checking Location..."
            : isInside
            ? "You're on Campus"
            : isOutside
            ? "Outside Campus"
            : "Location Error"}
        </Text>

        {distance !== null && !isChecking && (
          <Text style={styles.distanceText}>
            {distance}m from campus{" "}
            {isOutside ? `(need within ${CAMPUS_RADIUS_M}m)` : ""}
          </Text>
        )}

        {isError && (
          <Text style={styles.errorMsg}>
            Could not get your location. Please enable location permissions.
          </Text>
        )}

        {(isOutside || isError) && (
          <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
            <Ionicons name="refresh" size={18} color={Colors.white} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.demoBtn} onPress={skipGps}>
          <Ionicons name="flask-outline" size={16} color={Colors.accent} />
          <Text style={styles.demoBtnText}>Demo Mode (Skip GPS)</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  campusLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  campusName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  statusTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.white,
    textAlign: "center",
    marginBottom: 10,
  },
  distanceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 8,
  },
  errorMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginHorizontal: 12,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  demoBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
});
