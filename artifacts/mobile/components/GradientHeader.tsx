import { LinearGradient } from "expo-linear-gradient";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface Props {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function GradientHeader({ title, subtitle, left, right }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary]}
      style={[styles.container, { paddingTop: topPad + 12 }]}
    >
      <View style={styles.row}>
        {left ? <View style={styles.leftArea}>{left}</View> : null}
        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  leftArea: { flexShrink: 0 },
  textArea: { flex: 1 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.white,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
});
