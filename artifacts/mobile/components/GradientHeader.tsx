import { LinearGradient } from "expo-linear-gradient";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function GradientHeader({ title, subtitle, right }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary]}
      style={[styles.container, { paddingTop: topPad + 12 }]}
    >
      <View style={styles.row}>
        <View style={styles.textArea}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    justifyContent: "space-between",
  },
  textArea: { flex: 1 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.white,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
});
