import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G } from "react-native-svg";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PHASE_INFO = {
  menstrual: {
    label: "Menstrual",
    range: "Days 1–5",
    color: "#D97777",
    bg: "#D9777718",
    description: "Your body is releasing the uterine lining. Estrogen and progesterone are at their lowest. Energy often dips — and this is biologically intentional.",
    supports: ["Rest without guilt", "Warm, nourishing foods", "Iron-rich meals (leafy greens, lentils)", "Heat therapy for cramps"],
    expect: ["Lower energy and focus", "Sensitivity to cold", "Need for extra sleep", "Emotional processing"],
  },
  follicular: {
    label: "Follicular",
    range: "Days 6–13",
    color: "#D4956A",
    bg: "#D4956A18",
    description: "Estrogen rises as follicles develop. This is your natural growth phase — energy, creativity, and social ease all tend to increase.",
    supports: ["Higher-intensity exercise", "Fermented foods for gut health", "Sprouted seeds (sesame, pumpkin)", "Taking on new projects"],
    expect: ["More energy and drive", "Better sleep quality", "Improved mood and social ease", "Sharper focus"],
  },
  ovulation: {
    label: "Ovulation",
    range: "Days 14–16",
    color: "#7ABD98",
    bg: "#7ABD9818",
    description: "Peak estrogen. Your body is designed to feel its best right now. Communication, confidence, and vitality often peak — though ovulation may be irregular with PCOS.",
    supports: ["Cruciferous vegetables for estrogen metabolism", "Peak performance workouts", "Connection and collaboration", "Anti-inflammatory foods"],
    expect: ["High energy and confidence", "Strong communication", "Physical strength peak", "Mild mid-cycle spotting (normal)"],
  },
  luteal: {
    label: "Luteal",
    range: "Days 17–end",
    color: "#9B7EC8",
    bg: "#9B7EC818",
    description: "Progesterone rises. Your body shifts inward. PMS symptoms, cravings, and mood shifts are common — especially when progesterone is low, as in many with PCOS.",
    supports: ["B6, magnesium, and zinc-rich foods", "Lighter exercise like yoga or walking", "Protecting sleep carefully", "Reducing caffeine"],
    expect: ["Lower energy", "Increased appetite and cravings", "Emotional sensitivity", "Breast tenderness possible"],
  },
  unknown: {
    label: "Tracking",
    range: "Set cycle start",
    color: "#9C8C86",
    bg: "#9C8C8618",
    description: "Set your cycle start date in settings to see your current phase and personalized phase guidance.",
    supports: [],
    expect: [],
  },
};

function CycleRing({ cycleDay, cycleLength, phase }: { cycleDay: number; cycleLength: number; phase: string }) {
  const phaseInfo = PHASE_INFO[phase as keyof typeof PHASE_INFO] ?? PHASE_INFO.unknown;
  const progress = cycleDay / cycleLength;
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withTiming(1, { duration: 600 });
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[ringStyles.container, animStyle]}>
      <Svg width={size} height={size} style={ringStyles.svg}>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E8DDD7" strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={phaseInfo.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={ringStyles.center}>
        <Text style={[ringStyles.dayNum, { color: phaseInfo.color, fontFamily: "Inter_700Bold" }]}>{cycleDay}</Text>
        <Text style={[ringStyles.dayLabel, { fontFamily: "Inter_400Regular" }]}>of {cycleLength}</Text>
        <Text style={[ringStyles.phaseName, { color: phaseInfo.color, fontFamily: "Inter_500Medium" }]}>{phaseInfo.label}</Text>
      </View>
    </Animated.View>
  );
}

export default function CycleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getCycleDay, getCyclePhase, settings, updateSettings } = useApp();

  const cycleDay = getCycleDay();
  const phase = getCyclePhase();
  const phaseInfo = PHASE_INFO[phase] ?? PHASE_INFO.unknown;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const phases: Array<keyof typeof PHASE_INFO> = ["menstrual", "follicular", "ovulation", "luteal"];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Cycle view</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Day {cycleDay} of a {settings.cycleLength}-day cycle
      </Text>

      <View style={styles.ringSection}>
        <CycleRing cycleDay={cycleDay} cycleLength={settings.cycleLength} phase={phase} />
      </View>

      <View style={[styles.phaseCard, { backgroundColor: phaseInfo.bg, borderColor: phaseInfo.color + "44" }]}>
        <Text style={[styles.phaseTitle, { color: phaseInfo.color, fontFamily: "Inter_700Bold" }]}>{phaseInfo.label} phase</Text>
        <Text style={[styles.phaseRange, { color: phaseInfo.color + "cc", fontFamily: "Inter_400Regular" }]}>{phaseInfo.range}</Text>
        <Text style={[styles.phaseDesc, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{phaseInfo.description}</Text>
      </View>

      {phaseInfo.supports.length > 0 && (
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.listTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>What helps now</Text>
          {phaseInfo.supports.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <View style={[styles.listDot, { backgroundColor: phaseInfo.color }]} />
              <Text style={[styles.listText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {phaseInfo.expect.length > 0 && (
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.listTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>What to expect</Text>
          {phaseInfo.expect.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={[styles.listText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.phasesRow]}>
        {phases.map((p) => {
          const info = PHASE_INFO[p];
          const isActive = p === phase;
          return (
            <View key={p} style={[styles.phaseChip, { backgroundColor: isActive ? info.color : colors.muted, borderColor: isActive ? info.color : colors.border }]}>
              <Text style={[styles.phaseChipText, { color: isActive ? "#fff" : colors.mutedForeground, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{info.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.settingsTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cycle settings</Text>
        <View style={styles.settingsRow}>
          <Text style={[styles.settingsLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Cycle length</Text>
          <View style={styles.lengthControls}>
            <TouchableOpacity
              onPress={() => updateSettings({ cycleLength: Math.max(21, settings.cycleLength - 1) })}
              style={[styles.lengthBtn, { borderColor: colors.border }]}
            >
              <Feather name="minus" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.lengthValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{settings.cycleLength} days</Text>
            <TouchableOpacity
              onPress={() => updateSettings({ cycleLength: Math.min(60, settings.cycleLength + 1) })}
              style={[styles.lengthBtn, { borderColor: colors.border }]}
            >
              <Feather name="plus" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.settingsHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>PCOS cycles often range from 35-60 days. Adjust to match your average.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 26, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  ringSection: { alignItems: "center", marginBottom: 24 },
  phaseCard: { borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 16 },
  phaseTitle: { fontSize: 20, marginBottom: 4 },
  phaseRange: { fontSize: 13, marginBottom: 12 },
  phaseDesc: { fontSize: 14, lineHeight: 22 },
  listCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 16, gap: 12 },
  listTitle: { fontSize: 15, marginBottom: 4 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  listDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  listText: { flex: 1, fontSize: 14, lineHeight: 20 },
  phasesRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  phaseChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  phaseChipText: { fontSize: 12 },
  settingsCard: { borderRadius: 18, borderWidth: 1, padding: 18 },
  settingsTitle: { fontSize: 15, marginBottom: 14 },
  settingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  settingsLabel: { fontSize: 14 },
  lengthControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  lengthBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  lengthValue: { fontSize: 16, minWidth: 68, textAlign: "center" },
  settingsHint: { fontSize: 12, lineHeight: 18 },
});

const ringStyles = StyleSheet.create({
  container: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  svg: {},
  center: { position: "absolute", alignItems: "center" },
  dayNum: { fontSize: 48 },
  dayLabel: { fontSize: 13, color: "#9C8C86", marginTop: -4 },
  phaseName: { fontSize: 14, marginTop: 4 },
});
