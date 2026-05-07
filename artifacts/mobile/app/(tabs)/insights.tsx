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

import { Insight, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TYPE_META: Record<Insight["type"], { icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  pattern: { icon: "repeat", color: "#B97A8D", bg: "#B97A8D18" },
  correlation: { icon: "link", color: "#7A9E8C", bg: "#7A9E8C18" },
  milestone: { icon: "award", color: "#D4956A", bg: "#D4956A18" },
};

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

      <View style={styles.insightsList}>
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
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
  insightsList: { gap: 12 },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", marginTop: 20, gap: 12 },
  emptyTitle: { fontSize: 18 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  emptyBtnText: { fontSize: 15 },
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
