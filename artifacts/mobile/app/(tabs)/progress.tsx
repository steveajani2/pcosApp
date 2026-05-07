import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Milestone = { id: string; title: string; desc: string; target: number; icon: keyof typeof Feather.glyphMap; color: string };

const MILESTONES: Milestone[] = [
  { id: "m1", title: "First step", desc: "Complete your first check-in", target: 1, icon: "star", color: "#D4956A" },
  { id: "m3", title: "One week", desc: "7-day logging streak", target: 7, icon: "award", color: "#B97A8D" },
  { id: "m2", title: "Two weeks", desc: "14 days of tracking", target: 14, icon: "trending-up", color: "#7ABD98" },
  { id: "m4", title: "One month", desc: "30 days of consistent tracking", target: 30, icon: "calendar", color: "#9B7EC8" },
  { id: "m5", title: "Pattern finder", desc: "100 days of data", target: 100, icon: "compass", color: "#D97777" },
];

function StreakDisplay({ streak }: { streak: number }) {
  const colors = useColors();
  return (
    <View style={[sStyles.container, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "33" }]}>
      <View style={sStyles.row}>
        <View>
          <Text style={[sStyles.streakNum, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
          <Text style={[sStyles.streakLabel, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
            {streak === 1 ? "day streak" : "day streak"}
          </Text>
        </View>
        <View style={[sStyles.flame, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="zap" size={32} color={colors.primary} />
        </View>
      </View>
      {streak === 0 ? (
        <Text style={[sStyles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Complete today's check-in to start your streak</Text>
      ) : streak < 7 ? (
        <Text style={[sStyles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{7 - streak} more day{7 - streak !== 1 ? "s" : ""} to your first week milestone</Text>
      ) : (
        <Text style={[sStyles.hint, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Showing up consistently. Keep going.</Text>
      )}
    </View>
  );
}

function MilestoneCard({ milestone, count }: { milestone: Milestone; count: number }) {
  const colors = useColors();
  const achieved = count >= milestone.target;
  const progress = Math.min(1, count / milestone.target);
  return (
    <View style={[mStyles.card, { backgroundColor: colors.card, borderColor: achieved ? milestone.color + "66" : colors.border, opacity: achieved ? 1 : 0.65 }]}>
      <View style={[mStyles.icon, { backgroundColor: achieved ? milestone.color + "22" : colors.muted }]}>
        <Feather name={milestone.icon} size={20} color={achieved ? milestone.color : colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[mStyles.title, { color: achieved ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{milestone.title}</Text>
        <Text style={[mStyles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{milestone.desc}</Text>
        {!achieved && (
          <View style={[mStyles.track, { backgroundColor: colors.muted }]}>
            <View style={[mStyles.fill, { width: `${progress * 100}%`, backgroundColor: milestone.color }]} />
          </View>
        )}
      </View>
      {achieved && <Feather name="check-circle" size={20} color={milestone.color} />}
    </View>
  );
}

function SymptomChart() {
  const colors = useColors();
  const { checkIns } = useApp();
  if (checkIns.length === 0) return null;

  const recent = checkIns.slice(0, 14).reverse();
  const maxItems = 14;
  const displayData = recent.slice(-maxItems);

  const METRICS = [
    { key: "energy" as const, label: "Energy", color: "#7ABD98" },
    { key: "mood" as const, label: "Mood", color: "#B97A8D" },
    { key: "stress" as const, label: "Stress", color: "#D97777" },
  ];

  return (
    <View style={[cStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[cStyles.title, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Last 2 weeks</Text>
      {METRICS.map((metric) => (
        <View key={metric.key} style={cStyles.metricRow}>
          <Text style={[cStyles.metricLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{metric.label}</Text>
          <View style={cStyles.bars}>
            {displayData.map((c, i) => (
              <View key={i} style={[cStyles.barOuter, { backgroundColor: colors.muted }]}>
                <View style={[cStyles.barInner, { height: `${(c[metric.key] / 5) * 100}%`, backgroundColor: metric.color }]} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkIns, getStreak } = useApp();

  const streak = getStreak();
  const totalDays = checkIns.length;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your progress</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{totalDays} total check-in{totalDays !== 1 ? "s" : ""}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/companion")}
          style={({ pressed }) => [styles.companionBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44", opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="message-circle" size={18} color={colors.primary} />
          <Text style={[styles.companionText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Talk to Elara</Text>
        </Pressable>
      </View>

      <StreakDisplay streak={streak} />

      <SymptomChart />

      <View style={styles.milestonesSection}>
        <Text style={[styles.milestonesTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Milestones</Text>
        <View style={styles.milestonesList}>
          {MILESTONES.map((m) => (
            <MilestoneCard key={m.id} milestone={m} count={totalDays} />
          ))}
        </View>
      </View>

      {totalDays >= 7 && (
        <View style={[styles.exportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="file-text" size={24} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.exportTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Doctor's summary</Text>
            <Text style={[styles.exportDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>After 30 days you'll be able to export a symptom summary for your appointment</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 26, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  companionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  companionText: { fontSize: 13 },
  milestonesSection: { marginTop: 4 },
  milestonesTitle: { fontSize: 16, marginBottom: 12 },
  milestonesList: { gap: 10 },
  exportCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 18, marginTop: 20 },
  exportTitle: { fontSize: 15, marginBottom: 4 },
  exportDesc: { fontSize: 13, lineHeight: 18 },
});

const sStyles = StyleSheet.create({
  container: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  streakNum: { fontSize: 56 },
  streakLabel: { fontSize: 15, marginTop: -6 },
  flame: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 13, lineHeight: 18 },
});

const mStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, marginBottom: 4 },
  desc: { fontSize: 12 },
  track: { height: 4, borderRadius: 2, marginTop: 8, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});

const cStyles = StyleSheet.create({
  container: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20 },
  title: { fontSize: 15, marginBottom: 16 },
  metricRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  metricLabel: { width: 46, fontSize: 12 },
  bars: { flex: 1, flexDirection: "row", gap: 3, height: 32, alignItems: "flex-end" },
  barOuter: { flex: 1, height: "100%", borderRadius: 3, overflow: "hidden", justifyContent: "flex-end" },
  barInner: { width: "100%", borderRadius: 3 },
});
