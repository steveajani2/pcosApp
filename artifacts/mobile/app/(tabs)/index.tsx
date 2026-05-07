import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const GREETINGS = ["Good morning", "Good afternoon", "Good evening"];
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 17) return GREETINGS[1];
  return GREETINGS[2];
}

const PHASE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  menstrual: { label: "Menstrual", color: "#D97777", desc: "Rest and restore" },
  follicular: { label: "Follicular", color: "#D4956A", desc: "Rising energy" },
  ovulation: { label: "Ovulation", color: "#7ABD98", desc: "Peak vitality" },
  luteal: { label: "Luteal", color: "#9B7EC8", desc: "Turn inward" },
  unknown: { label: "Cycle", color: "#9C8C86", desc: "Track your cycle" },
};

function SymptomMiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={mStyles.miniBar}>
      <Text style={[mStyles.miniLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <View style={[mStyles.miniTrack, { backgroundColor: colors.muted }]}>
        <View style={[mStyles.miniFill, { width: `${(value / 5) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, getTodayCheckIn, getStreak, getCycleDay, getCyclePhase } = useApp();

  const todayCheckIn = getTodayCheckIn();
  const streak = getStreak();
  const cycleDay = getCycleDay();
  const phase = getCyclePhase();
  const phaseInfo = PHASE_LABELS[phase];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const name = settings.name ? settings.name.split(" ")[0] : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#F9F0ED", colors.background]}
        style={[styles.gradient, { height: 280 + topPad }]}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{getGreeting()}{name ? `, ${name}` : ""}</Text>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your daily check-in</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/companion")}
            style={[styles.companionBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="message-circle" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Day streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: phaseInfo.color, fontFamily: "Inter_700Bold" }]}>{cycleDay}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Cycle day</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/cycle")}
            style={[styles.phasePill, { backgroundColor: phaseInfo.color + "22", borderColor: phaseInfo.color + "55" }]}
          >
            <View style={[styles.phaseDot, { backgroundColor: phaseInfo.color }]} />
            <Text style={[styles.phaseLabel, { color: phaseInfo.color, fontFamily: "Inter_500Medium" }]}>{phaseInfo.label}</Text>
          </TouchableOpacity>
        </View>

        {!todayCheckIn ? (
          <View style={[styles.checkInCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.checkInIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="sun" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.checkInTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>How are you feeling today?</Text>
            <Text style={[styles.checkInSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>A 2-minute check-in to get your personalized guidance for today</Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/checkin"); }}
              style={({ pressed }) => [styles.checkInBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.checkInBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>Start check-in</Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.doneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.doneHeader}>
              <View style={[styles.doneCheck, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={18} color={colors.accentForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.doneTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Check-in complete</Text>
                <Text style={[styles.doneSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Today's symptoms logged</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/checkin")}>
                <Text style={[styles.editLink, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.barsSection}>
              <SymptomMiniBar label="Energy" value={todayCheckIn.energy} color={colors.accent} />
              <SymptomMiniBar label="Mood" value={todayCheckIn.mood} color={colors.primary} />
              <SymptomMiniBar label="Stress" value={todayCheckIn.stress} color="#D97777" />
              <SymptomMiniBar label="Bloating" value={todayCheckIn.bloating} color="#D4956A" />
            </View>

            {todayCheckIn.hasPeriod && (
              <View style={[styles.periodBadge, { backgroundColor: "#D9777722" }]}>
                <View style={[styles.phaseDot, { backgroundColor: "#D97777" }]} />
                <Text style={[styles.periodBadgeText, { color: "#D97777", fontFamily: "Inter_400Regular" }]}>Period today</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/guidance")}
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="sun" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.quickTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Today's guidance</Text>
            <Text style={[styles.quickSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Meals, movement, recovery</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginTop: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/insights")}
            style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="trending-up" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.quickTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Your patterns</Text>
            <Text style={[styles.quickSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Connections in your data</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginTop: 4 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { position: "absolute", top: 0, left: 0, right: 0 },
  scroll: { paddingHorizontal: 20 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  greeting: { fontSize: 14, marginBottom: 4 },
  title: { fontSize: 26 },
  companionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  statCard: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", minWidth: 72 },
  statValue: { fontSize: 24 },
  statLabel: { fontSize: 11, marginTop: 2 },
  phasePill: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 6, flex: 1, justifyContent: "center" },
  phaseDot: { width: 7, height: 7, borderRadius: 4 },
  phaseLabel: { fontSize: 13 },
  checkInCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 20 },
  checkInIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  checkInTitle: { fontSize: 20, textAlign: "center", marginBottom: 8 },
  checkInSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  checkInBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28 },
  checkInBtnText: { fontSize: 16 },
  doneCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 20 },
  doneHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  doneCheck: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 16 },
  doneSub: { fontSize: 13, marginTop: 2 },
  editLink: { fontSize: 14 },
  barsSection: { gap: 10 },
  periodBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start", marginTop: 12 },
  periodBadgeText: { fontSize: 13 },
  quickActions: { flexDirection: "row", gap: 12 },
  quickCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  quickTitle: { fontSize: 14, marginBottom: 4 },
  quickSub: { fontSize: 12, lineHeight: 16 },
});

const mStyles = StyleSheet.create({
  miniBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  miniLabel: { width: 52, fontSize: 12 },
  miniTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 3 },
});
