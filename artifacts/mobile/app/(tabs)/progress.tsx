import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, interpolate } from "react-native-reanimated";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { AssistantButton } from "../../components/AssistantButton";
import { OnboardingTour, TourStep } from "../../components/OnboardingTour";

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
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.1], [0.3, 0.6]),
  }));

  return (
    <Animated.View entering={FadeInUp.delay(200)} style={[sStyles.container, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
      <LinearGradient
        colors={[colors.primary + "15", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={sStyles.row}>
        <View>
          <Text style={[sStyles.streakNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
          <Text style={[sStyles.streakLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            {streak === 1 ? "DAY STREAK" : "DAY STREAK"}
          </Text>
        </View>
        <View style={sStyles.iconStack}>
           <Animated.View style={[sStyles.iconGlow, glowStyle, { backgroundColor: "#9B7EC8" }]} />
           <View style={[sStyles.flame, { backgroundColor: "#9B7EC815" }]}>
             <Feather name="zap" size={28} color="#9B7EC8" />
           </View>
        </View>
      </View>
      <View style={[sStyles.divider, { backgroundColor: colors.border }]} />
      <Text style={[sStyles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {streak === 0 ? "Complete today's check-in to start your streak" : "Consistency is key to hormonal balance. Keep it up!"}
      </Text>
    </Animated.View>
  );
}

function MilestoneCard({ milestone, count }: { milestone: Milestone; count: number }) {
  const colors = useColors();
  const achieved = count >= milestone.target;
  const progress = Math.min(1, count / milestone.target);
  return (
    <View style={[mStyles.card, { backgroundColor: colors.card, borderColor: achieved ? milestone.color + "66" : colors.border, opacity: achieved ? 1 : 0.65, overflow: 'hidden' }]}>
      {achieved && (
        <LinearGradient
          colors={[milestone.color + "20", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
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

  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem("@nylaia/tour_seen_progress").then(v => { if (!v) setShowOnboarding(true); });
  }, []);

  const finishTour = () => {
    AsyncStorage.setItem("@nylaia/tour_seen_progress", "1");
    setShowOnboarding(false);
  };

  const progressSteps: TourStep[] = [
      { 
          title: "Consistency Tracking", 
          desc: "Monitor your logging streak. Consistency is key to accurate protocol synthesis.",
          pointerTop: 160,
      },
      { 
          title: "Bio-Data Trends", 
          desc: "Visualize your energy, mood, and stress levels over the last 14 days.",
          pointerTop: 300,
      },
      { 
          title: "Milestones", 
          desc: "Unlock achievements as you build long-term hormonal balance habits.",
          pointerTop: 540,
      }
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OnboardingTour
          visible={showOnboarding}
          onFinish={finishTour}
          steps={progressSteps}
          onStepChange={(step) => {
              if (step === 1) scrollRef.current?.scrollTo({ y: 150, animated: true });
              if (step === 2) scrollRef.current?.scrollTo({ y: 350, animated: true });
          }}
      />
      {/* Immersive Bloom Background */}
      <View style={[styles.bloom, { backgroundColor: colors.primary + "08" }]} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(100)} style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your Progress</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{totalDays} check-ins logged</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity 
                  onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setShowOnboarding(true);
                  }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}
              >
                  <Feather name="help-circle" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <AssistantButton label="ASK NYLAIA" />
          </View>
        </Animated.View>

        <StreakDisplay streak={streak} />

        <Animated.View entering={FadeInUp.delay(300)}>
            <SymptomChart />
        </Animated.View>

        <View style={styles.milestonesSection}>
          <Text style={[styles.milestonesTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Milestones</Text>
          <View style={styles.milestonesList}>
            {MILESTONES.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInUp.delay(400 + (i * 100))}>
                <MilestoneCard milestone={m} count={totalDays} />
              </Animated.View>
            ))}
          </View>
        </View>

        {totalDays >= 7 && (
          <Animated.View entering={FadeInUp.delay(800)}>
            <Pressable
              onPress={() => router.push("/report")}
              style={({ pressed }) => [styles.exportCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.exportIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="file-text" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Doctor's report</Text>
                <Text style={[styles.exportDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Export a detailed summary PDF for your next visit.</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bloom: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, borderRadius: 150, transform: [{ scale: 1.5 }], opacity: 0.5 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  title: { fontSize: 28, letterSpacing: -1 },
  subtitle: { fontSize: 14 },
  milestonesSection: { marginTop: 28 },
  milestonesTitle: { fontSize: 18, marginBottom: 16, letterSpacing: -0.4 },
  milestonesList: { gap: 12 },
  exportCard: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 24, borderWidth: 1, padding: 20, marginTop: 24 },
  exportIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  exportTitle: { fontSize: 16, marginBottom: 4 },
  exportDesc: { fontSize: 13, lineHeight: 18 },
});

const sStyles = StyleSheet.create({
  container: { borderRadius: 32, borderWidth: 1, padding: 24, marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  streakNum: { fontSize: 64, letterSpacing: -2 },
  streakLabel: { fontSize: 12, letterSpacing: 1.5, marginTop: -4 },
  iconStack: { alignItems: 'center', justifyContent: 'center' },
  iconGlow: { position: 'absolute', width: 50, height: 50, borderRadius: 25 },
  flame: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", zIndex: 1 },
  divider: { height: 1, marginBottom: 16, opacity: 0.5 },
  hint: { fontSize: 13, lineHeight: 20 },
});

const mStyles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 24, borderWidth: 1, padding: 20 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, marginBottom: 4 },
  desc: { fontSize: 12, opacity: 0.8 },
  track: { height: 6, borderRadius: 3, marginTop: 10, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});

const cStyles = StyleSheet.create({
  container: { borderRadius: 32, borderWidth: 1, padding: 24, marginBottom: 24 },
  title: { fontSize: 16, marginBottom: 20, letterSpacing: -0.4 },
  metricRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  metricLabel: { width: 50, fontSize: 12 },
  bars: { flex: 1, flexDirection: "row", gap: 4, height: 40, alignItems: "flex-end" },
  barOuter: { flex: 1, height: "100%", borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barInner: { width: "100%", borderRadius: 4 },
});
