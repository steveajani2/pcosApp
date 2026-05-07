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

import { GuidanceItem, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_META: Record<GuidanceItem["category"], { label: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  meals: { label: "Nourishment", icon: "coffee", color: "#D4956A", bg: "#D4956A18" },
  movement: { label: "Movement", icon: "activity", color: "#7ABD98", bg: "#7ABD9818" },
  recovery: { label: "Recovery", icon: "moon", color: "#9B7EC8", bg: "#9B7EC818" },
};

function GuidanceCard({ item }: { item: GuidanceItem }) {
  const colors = useColors();
  const meta = CATEGORY_META[item.category];
  return (
    <View style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[gStyles.iconBox, { backgroundColor: meta.bg }]}>
        <Feather name={meta.icon} size={20} color={meta.color} />
      </View>
      <Text style={[gStyles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.title}</Text>
      <Text style={[gStyles.cardDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item.description}</Text>
    </View>
  );
}

export default function GuidanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTodayGuidance, getTodayCheckIn } = useApp();

  const guidance = getTodayGuidance();
  const hasCheckIn = !!getTodayCheckIn();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const meals = guidance.filter((g) => g.category === "meals");
  const movement = guidance.filter((g) => g.category === "movement");
  const recovery = guidance.filter((g) => g.category === "recovery");

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Today's guidance</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {hasCheckIn ? "Tailored to how you're feeling" : "Log your check-in for personalized guidance"}
          </Text>
        </View>
        <View style={[styles.dateBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.dateText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </Text>
        </View>
      </View>

      {!hasCheckIn && (
        <Pressable
          onPress={() => router.push("/checkin")}
          style={({ pressed }) => [styles.checkInBanner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44", opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="edit-3" size={18} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Complete today's check-in for personalized guidance</Text>
          <Feather name="arrow-right" size={16} color={colors.primary} />
        </Pressable>
      )}

      {meals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: CATEGORY_META.meals.color }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Nourishment</Text>
          </View>
          {meals.map((item) => <GuidanceCard key={item.id} item={item} />)}
        </View>
      )}

      {movement.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: CATEGORY_META.movement.color }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Movement</Text>
          </View>
          {movement.map((item) => <GuidanceCard key={item.id} item={item} />)}
        </View>
      )}

      {recovery.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: CATEGORY_META.recovery.color }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Recovery</Text>
          </View>
          {recovery.map((item) => <GuidanceCard key={item.id} item={item} />)}
        </View>
      )}

      <View style={[styles.disclaimer, { backgroundColor: colors.muted, borderRadius: 14 }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.disclaimerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Guidance is informational, not medical advice. Always work with your healthcare provider.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 26, marginBottom: 4 },
  subtitle: { fontSize: 14 },
  dateBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  dateText: { fontSize: 12 },
  checkInBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 24 },
  bannerText: { flex: 1, fontSize: 14 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16 },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 14 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

const gStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 10 },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 21 },
});
