import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckIn, Insight, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TYPE_META: Record<Insight["type"], { icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  pattern: { icon: "repeat", color: "#B97A8D", bg: "#B97A8D18" },
  correlation: { icon: "link", color: "#7A9E8C", bg: "#7A9E8C18" },
  milestone: { icon: "award", color: "#D4956A", bg: "#D4956A18" },
};

type SymptomKey = "energy" | "mood" | "stress" | "bloating" | "cravings" | "acne";

const SYMPTOM_LABELS: Record<SymptomKey, string> = {
  energy: "Energy",
  mood: "Mood",
  stress: "Stress",
  bloating: "Bloating",
  cravings: "Cravings",
  acne: "Acne",
};

type Correlation = {
  a: SymptomKey;
  b: SymptomKey;
  r: number;
  strength: "strong" | "moderate";
  headline: string;
  insight: string;
};

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 4) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

const CORRELATION_PHRASES: Partial<Record<`${SymptomKey}_${SymptomKey}`, { pos: [string, string]; neg: [string, string] }>> = {
  stress_mood:    { pos: ["Stress lifts your mood", "Unexpectedly, higher stress seems linked to better mood for you — this may reflect that structured, busy days feel energising."], neg: ["Stress lowers your mood", "On your most stressed days your mood consistently drops — cortisol's direct impact on serotonin at work. Managing stress is protecting your mental health."] },
  stress_energy:  { pos: ["Stress boosts your energy", "Your data shows higher stress days are also higher-energy days — likely driven by cortisol's short-term stimulating effect."], neg: ["Stress drains your energy", "High-stress days leave you with noticeably less energy. Cortisol spikes are energy-expensive — your body is paying the cost."] },
  stress_cravings:{ pos: ["Stress fuels your cravings", "Every spike in stress brings a spike in cravings — this is a textbook cortisol-blood sugar loop that is especially powerful in PCOS. Protein-first meals on hard days can help break it."], neg: ["Stress reduces your cravings", "Your data shows stress actually dampens cravings for you — your appetite regulation pattern is working differently than average."] },
  stress_bloating:{ pos: ["Stress worsens your bloating", "Stress and bloating are tightly linked in your data. The gut-brain axis is direct — cortisol slows digestion, increases gut permeability, and inflames the gut lining."], neg: ["Stress calms your bloating", "Interestingly, stress appears to reduce bloating for you — this can happen when stress suppresses appetite or changes gut motility patterns."] },
  stress_acne:    { pos: ["Stress triggers your breakouts", "Cortisol drives sebum production and inflammation — both acne triggers. Your data confirms this link clearly. Stress management is skincare for you."], neg: ["Stress and acne don't correlate for you", "Your breakouts don't follow your stress patterns closely — other factors like cycle phase, diet, or sleep may be stronger drivers."] },
  energy_mood:    { pos: ["Energy and mood move together", "When your energy is up, your mood follows — and vice versa. These two are tightly coupled for you, likely sharing the same underlying drivers: sleep, blood sugar, and inflammation."], neg: ["High energy, lower mood", "Your high-energy days sometimes come with lower mood — this can reflect anxiety-driven alertness rather than true well-being."] },
  energy_cravings:{ pos: ["Low energy brings cravings", "Your data shows that lower energy days push you towards cravings — your body is reaching for quick fuel when it's running low."], neg: ["High energy reduces cravings", "When you feel energised, cravings drop. This suggests your cravings are partly driven by low energy and blood sugar dips rather than habit."] },
  bloating_energy:{ pos: ["Bloating tracks your energy", "Unexpectedly, you have more energy on bloating days — this pattern may reflect your cycle phase influencing both."], neg: ["Bloating drains your energy", "Bloating and low energy appear together in your data consistently. Gut inflammation is a real energy drain — reducing inflammatory foods on bad days may help both."] },
  bloating_mood:  { pos: ["Bloating improves your mood", "Your data shows an unusual link between bloating and better mood — this may reflect cycle timing where both improve together in certain phases."], neg: ["Bloating dampens your mood", "Feeling bloated consistently coincides with lower mood in your logs. Physical discomfort has a measurable emotional cost — addressing gut inflammation may lift mood too."] },
  mood_cravings:  { pos: ["Low mood drives cravings", "When mood dips, cravings rise in your data — classic emotional eating pattern. Recognising this link is the first step to responding differently."], neg: ["Better mood, fewer cravings", "Your data confirms: higher mood days bring fewer cravings. The link between emotional state and appetite is strong and measurable in your tracking."] },
  acne_mood:      { pos: ["Acne affects your mood", "Your mood dips on high-acne days in a clear pattern. The psychological impact of visible PCOS symptoms is real and valid — and often underacknowledged by providers."], neg: ["Acne doesn't affect your mood much", "Your mood stays relatively stable regardless of acne severity — a real sign of resilience."] },
};

function describeCorrelation(a: SymptomKey, b: SymptomKey, r: number): { headline: string; insight: string } {
  const key = `${a}_${b}` as keyof typeof CORRELATION_PHRASES;
  const reverseKey = `${b}_${a}` as keyof typeof CORRELATION_PHRASES;
  const phrases = CORRELATION_PHRASES[key] ?? CORRELATION_PHRASES[reverseKey];

  if (phrases) {
    const [headline, insight] = r > 0 ? phrases.pos : phrases.neg;
    return { headline, insight };
  }

  const dir = r > 0 ? "tend to rise together" : "move in opposite directions";
  return {
    headline: `${SYMPTOM_LABELS[a]} & ${SYMPTOM_LABELS[b]} ${dir}`,
    insight: `When ${SYMPTOM_LABELS[a].toLowerCase()} is high, ${SYMPTOM_LABELS[b].toLowerCase()} tends to be ${r > 0 ? "high" : "low"} too — a pattern worth tracking.`,
  };
}

function computeTopCorrelations(checkIns: CheckIn[]): Correlation[] {
  if (checkIns.length < 7) return [];

  const keys: SymptomKey[] = ["energy", "mood", "stress", "bloating", "cravings", "acne"];
  const results: Correlation[] = [];

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i];
      const b = keys[j];
      const xs = checkIns.map((c) => c[a]);
      const ys = checkIns.map((c) => c[b]);
      const r = pearson(xs, ys);
      const abs = Math.abs(r);
      if (abs >= 0.3) {
        const { headline, insight } = describeCorrelation(a, b, r);
        results.push({
          a, b, r,
          strength: abs >= 0.6 ? "strong" : "moderate",
          headline,
          insight,
        });
      }
    }
  }

  return results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 3);
}

function CorrelationCard({ corr, index }: { corr: Correlation; index: number }) {
  const colors = useColors();
  const isPositive = corr.r > 0;
  const abs = Math.abs(corr.r);
  const barWidth = Math.min(100, abs * 100);
  const barColor = corr.strength === "strong" ? colors.primary : colors.accent;
  const rankColors = ["#B97A8D", "#7A9E8C", "#D4956A"];
  const rankColor = rankColors[index] ?? colors.primary;

  return (
    <View style={[corrStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={corrStyles.cardHeader}>
        <View style={[corrStyles.rank, { backgroundColor: rankColor + "20" }]}>
          <Text style={[corrStyles.rankNum, { color: rankColor, fontFamily: "Inter_700Bold" }]}>#{index + 1}</Text>
        </View>
        <View style={corrStyles.pills}>
          <View style={[corrStyles.pill, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[corrStyles.pillText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>{SYMPTOM_LABELS[corr.a]}</Text>
          </View>
          <Feather name={isPositive ? "arrow-right" : "repeat"} size={12} color={colors.mutedForeground} />
          <View style={[corrStyles.pill, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[corrStyles.pillText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>{SYMPTOM_LABELS[corr.b]}</Text>
          </View>
        </View>
        <View style={[corrStyles.badge, { backgroundColor: corr.strength === "strong" ? colors.primary + "18" : colors.muted }]}>
          <Text style={[corrStyles.badgeText, { color: corr.strength === "strong" ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            {corr.strength === "strong" ? "Strong" : "Moderate"}
          </Text>
        </View>
      </View>

      <Text style={[corrStyles.headline, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{corr.headline}</Text>
      <Text style={[corrStyles.insight, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{corr.insight}</Text>

      <View style={corrStyles.barRow}>
        <Text style={[corrStyles.barLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Correlation strength</Text>
        <View style={[corrStyles.barTrack, { backgroundColor: colors.muted }]}>
          <View style={[corrStyles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[corrStyles.barPct, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{Math.round(abs * 100)}%</Text>
      </View>
    </View>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const colors = useColors();
  const meta = TYPE_META[insight.type];
  return (
    <View style={[iStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[iStyles.iconBox, { backgroundColor: meta.bg }]}>
        <Feather name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[iStyles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{insight.title}</Text>
        <Text style={[iStyles.cardDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{insight.description}</Text>
      </View>
    </View>
  );
}

function WeekHeatmap() {
  const colors = useColors();
  const { checkIns } = useApp();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();

  const weekData = days.map((_, i) => {
    const d = new Date(today);
    const dayOfWeek = today.getDay();
    const mondayOffset = (dayOfWeek + 6) % 7;
    d.setDate(today.getDate() - mondayOffset + i);
    const dateStr = d.toISOString().split("T")[0];
    const c = checkIns.find((ci) => ci.date === dateStr);
    return { day: days[i], checkIn: c ?? null };
  });

  return (
    <View style={[hStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[hStyles.title, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>This week</Text>
      <View style={hStyles.row}>
        {weekData.map((item) => {
          const avgScore = item.checkIn
            ? Math.round((item.checkIn.energy + item.checkIn.mood) / 2)
            : 0;
          const fillColors = ["transparent", "#D9777755", "#D4956A55", "#B97A8D55", "#7A9E8C55", "#7ABD9877"];
          const fill = item.checkIn ? fillColors[avgScore] ?? colors.muted : "transparent";
          const today_str = new Date().toISOString().split("T")[0];
          const isToday = item.checkIn?.date === today_str;
          return (
            <View key={item.day} style={hStyles.dayCol}>
              <View style={[hStyles.dot, { backgroundColor: fill, borderColor: isToday ? colors.primary : colors.border, borderWidth: isToday ? 2 : 1 }]}>
                {item.checkIn && <Feather name="check" size={10} color={colors.foreground} />}
              </View>
              <Text style={[hStyles.dayLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkIns, getInsights } = useApp();

  const insights = getInsights();
  const correlations = useMemo(() => computeTopCorrelations(checkIns), [checkIns]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;
  const daysLogged = checkIns.length;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your patterns</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {daysLogged === 0 ? "Start logging to see patterns" : `${daysLogged} day${daysLogged !== 1 ? "s" : ""} of data`}
        </Text>
      </View>

      <WeekHeatmap />

      {daysLogged < 7 && (
        <View style={[styles.progressCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="clock" size={18} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.progressTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Patterns form at day 7</Text>
            <Text style={[styles.progressSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{7 - daysLogged} more check-in{7 - daysLogged !== 1 ? "s" : ""} until Elara starts surfacing connections</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${(daysLogged / 7) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>
      )}

      {correlations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="zap" size={15} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your top connections</Text>
          </View>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            The strongest links found in your personal data — not general PCOS advice.
          </Text>
          <View style={styles.corrList}>
            {correlations.map((c, i) => (
              <CorrelationCard key={`${c.a}_${c.b}`} corr={c} index={i} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        {correlations.length > 0 && (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: "#D4956A18" }]}>
              <Feather name="star" size={15} color="#D4956A" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Observations</Text>
          </View>
        )}
        <View style={styles.insightsList}>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>
      </View>

      {daysLogged === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="bar-chart-2" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>No data yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Complete your first check-in to start building your personal pattern library</Text>
          <Pressable
            onPress={() => router.push("/checkin")}
            style={({ pressed }) => [styles.emptyBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.primaryForeground, fontFamily: "Inter_500Medium" }]}>Start check-in</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  progressCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, flexWrap: "wrap" },
  progressTitle: { fontSize: 14, marginBottom: 4 },
  progressSub: { fontSize: 12, lineHeight: 18 },
  progressTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  progressFill: { height: "100%", borderBottomLeftRadius: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  sectionIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17 },
  sectionSub: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  corrList: { gap: 14 },
  insightsList: { gap: 12 },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", marginTop: 20, gap: 12 },
  emptyTitle: { fontSize: 18 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnText: { fontSize: 15 },
});

const corrStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rank: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rankNum: { fontSize: 12 },
  pills: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11 },
  headline: { fontSize: 15, lineHeight: 22 },
  insight: { fontSize: 13, lineHeight: 20 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  barLabel: { fontSize: 11, width: 122 },
  barTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  barPct: { fontSize: 12, width: 30, textAlign: "right" },
});

const iStyles = StyleSheet.create({
  card: { flexDirection: "row", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  iconBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { fontSize: 15, marginBottom: 6 },
  cardDesc: { fontSize: 13, lineHeight: 20 },
});

const hStyles = StyleSheet.create({
  container: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20 },
  title: { fontSize: 15, marginBottom: 14 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 6 },
  dot: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dayLabel: { fontSize: 11 },
});
