import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";

import { getBaseUrl, setBaseUrl } from "@/lib/query-client";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getBaseUrl() || "https://smart-attendance-api-5ap4.onrender.com");
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverMsg, setServerMsg] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      const user = await getCurrentUser();
      if (user?.role === "admin") router.replace("/(admin)/" as any);
      else if (user?.role === "teacher") router.replace("/(teacher)/" as any);
      else router.replace("/(student)/" as any);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("Network request failed") || msg.includes("Failed to fetch")) {
        setError(`Cannot reach backend at ${getBaseUrl()}.\nMake sure your phone is connected to the same Wi-Fi as your PC, or expand "Server Settings" below to update the IP.`);
      } else {
        setError(msg || "Login failed. Check credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSaveServerUrl() {
    if (!serverUrlInput.trim()) return;
    setBaseUrl(serverUrlInput.trim());
    setServerMsg("Server URL updated!");
    setError("");
    setTimeout(() => setServerMsg(""), 3000);
  }

  async function getCurrentUser() {
    try {
      const { getApiUrl } = await import("@/lib/query-client");
      const res = await fetch(getApiUrl("/auth/me"), { credentials: "include" });
      if (res.ok) return (await res.json()).user;
    } catch {}
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          style={[styles.header, { paddingTop: topPad + 20 }]}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="school" size={36} color={Colors.white} />
          </View>
          <Text style={styles.headerTitle}>Campus Attendance</Text>
          <Text style={styles.headerSubtitle}>K.C. College of Engineering</Text>
        </LinearGradient>

        <View style={[styles.form, { paddingBottom: bottomPad + 24 }]}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>Use your campus credentials</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="your@campus.edu"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={Colors.white} />
                <Text style={styles.loginBtnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Demo Accounts</Text>
            {[
              { label: "Admin", email: "admin@campus.edu", pw: "admin123" },
              { label: "Teacher", email: "anita@campus.edu", pw: "teacher123" },
              { label: "Student", email: "priya@campus.edu", pw: "student123" },
            ].map((acc) => (
              <TouchableOpacity
                key={acc.email}
                style={styles.demoItem}
                onPress={() => {
                  setEmail(acc.email);
                  setPassword(acc.pw);
                  setError("");
                }}
              >
                <View style={styles.demoItemLeft}>
                  <Text style={styles.demoItemLabel}>{acc.label}</Text>
                  <Text style={styles.demoItemEmail}>{acc.email}</Text>
                </View>
                <Ionicons name="arrow-forward-circle-outline" size={20} color={Colors.accent} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.serverToggleBtn}
            onPress={() => setShowServerSettings((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="hardware-chip-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.serverToggleText}>
              Server: {getBaseUrl() || "https://smart-attendance-api-5ap4.onrender.com"}
            </Text>
            <Ionicons
              name={showServerSettings ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showServerSettings ? (
            <View style={styles.serverCard}>
              <Text style={styles.serverCardTitle}>Backend Server Address</Text>
              <Text style={styles.serverCardSubtitle}>
                Connected to Cloud Server (Render). Update if custom server:
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="link-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  placeholder="https://smart-attendance-api-5ap4.onrender.com"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {serverMsg ? <Text style={styles.serverMsgText}>{serverMsg}</Text> : null}
              <TouchableOpacity style={styles.saveServerBtn} onPress={handleSaveServerUrl}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.saveServerBtnText}>Save & Update Server</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: "center",
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  form: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.background,
  },
  formTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
  },
  eyeBtn: { padding: 4 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 28,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.white,
  },
  demoSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  demoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  demoItemLeft: { flex: 1 },
  demoItemLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  demoItemEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  serverToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
  },
  serverToggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textMuted,
  },
  serverCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serverCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    marginBottom: 4,
  },
  serverCardSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  serverMsgText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#10B981",
    marginTop: 8,
  },
  saveServerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  saveServerBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.white,
  },
});
