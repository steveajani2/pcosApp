import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const MIN_CYCLE = 14;
const MAX_CYCLE = 60;
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["S","M","T","W","T","F","S"];

function formatDisplayDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function CalendarPicker({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const [viewDate, setViewDate] = useState(() => {
    const v = new Date(value);
    v.setDate(1);
    return v;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const canGoNext = new Date(year, month + 1, 1) <= today;

  const prevMonth = () => {
    Haptics.selectionAsync();
    setViewDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    if (!canGoNext) return;
    Haptics.selectionAsync();
    setViewDate(new Date(year, month + 1, 1));
  };

  const isSelected = (d: number) =>
    value.getFullYear() === year &&
    value.getMonth() === month &&
    value.getDate() === d;

  const isFuture = (d: number) => new Date(year, month, d) > today;

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={[styles.calSheet, { backgroundColor: colors.card }]}>
      {/* Drag handle */}
      <View style={[styles.calHandle, { backgroundColor: colors.border }]} />

      <Text style={[styles.calTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        Select date
      </Text>

      {/* Month navigation */}
      <View style={styles.calMonthRow}>
        <TouchableOpacity onPress={prevMonth} style={[styles.calNavBtn, { backgroundColor: colors.muted }]}>
          <Feather name="chevron-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.calMonthLabel, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={nextMonth}
          disabled={!canGoNext}
          style={[styles.calNavBtn, { backgroundColor: colors.muted, opacity: canGoNext ? 1 : 0.3 }]}
        >
          <Feather name="chevron-right" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.calDayRow}>
        {DAY_LABELS.map((l, i) => (
          <Text key={i} style={[styles.calDayLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            {l}
          </Text>
        ))}
      </View>

      {/* Date grid */}
      <View style={styles.calGrid}>
        {cells.map((d, i) =>
          d === null ? (
            <View key={i} style={styles.calCell} />
          ) : (
            <TouchableOpacity
              key={i}
              disabled={isFuture(d)}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(new Date(year, month, d));
                onClose();
              }}
              style={[
                styles.calCell,
                isSelected(d) && { backgroundColor: colors.primary, borderRadius: 22 },
              ]}
            >
              <Text
                style={[
                  styles.calDayNum,
                  {
                    color: isFuture(d)
                      ? colors.mutedForeground + "30"
                      : isSelected(d)
                      ? "#fff"
                      : colors.foreground,
                    fontFamily: isSelected(d) ? "Inter_700Bold" : "Inter_400Regular",
                  },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish() {
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Session expired. Please sign in again.");
      return;
    }

    const cycleStartDate = selectedDate.toISOString().split("T")[0];

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cycle_start_date: cycleStartDate, cycle_length: cycleLength, onboarded: true })
      .eq("id", user.id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#D4A5B215", "transparent"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="moon" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Let's calibrate{"\n"}your cycle
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            This helps Nylaia personalize your guidance, phase tracking, and symptom insights.
          </Text>
        </View>

        <View style={styles.formSection}>
          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Date picker card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              LAST PERIOD START DATE
            </Text>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              The first day of your most recent period
            </Text>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCalendar(true); }}
              style={[styles.dateBtn, { backgroundColor: colors.muted, borderColor: colors.primary + "60" }]}
            >
              <View style={[styles.dateBtnIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="calendar" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.dateBtnText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {formatDisplayDate(selectedDate)}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Cycle length card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              AVERAGE CYCLE LENGTH
            </Text>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Most cycles are 21–35 days. PCOS cycles are often longer.
            </Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => {
                  if (cycleLength > MIN_CYCLE) {
                    setCycleLength(c => c - 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[styles.stepBtn, { backgroundColor: colors.muted, opacity: cycleLength <= MIN_CYCLE ? 0.4 : 1 }]}
              >
                <Feather name="minus" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <View style={styles.stepValue}>
                <Text style={[styles.stepNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {cycleLength}
                </Text>
                <Text style={[styles.stepUnit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  days
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (cycleLength < MAX_CYCLE) {
                    setCycleLength(c => c + 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[styles.stepBtn, { backgroundColor: colors.muted, opacity: cycleLength >= MAX_CYCLE ? 0.4 : 1 }]}
              >
                <Feather name="plus" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={onFinish}
          disabled={loading}
          style={[styles.continueBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Text style={[styles.continueBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                START MY JOURNEY
              </Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Calendar modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <CalendarPicker
              value={selectedDate}
              onChange={setSelectedDate}
              onClose={() => setShowCalendar(false)}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const CELL_SIZE = Math.floor((width - 48) / 7);

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  heroSection: { alignItems: "center", marginBottom: 40 },
  iconBox: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 32, letterSpacing: -1, textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", opacity: 0.8, maxWidth: 280 },
  formSection: { gap: 16, marginBottom: 32 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20 },
  fieldLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  fieldHint: { fontSize: 12, lineHeight: 18, marginBottom: 16, opacity: 0.7 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5 },
  dateBtnIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dateBtnText: { flex: 1, fontSize: 16 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepValue: { alignItems: "center" },
  stepNum: { fontSize: 40, letterSpacing: -1 },
  stepUnit: { fontSize: 13, marginTop: -4 },
  continueBtn: { height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  continueBtnText: { fontSize: 14, letterSpacing: 1 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },

  // Calendar sheet
  calSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 36 },
  calHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20, opacity: 0.3 },
  calTitle: { fontSize: 20, letterSpacing: -0.5, marginBottom: 24, textAlign: "center" },
  calMonthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  calNavBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  calMonthLabel: { fontSize: 17, letterSpacing: -0.3 },
  calDayRow: { flexDirection: "row", marginBottom: 8 },
  calDayLabel: { width: CELL_SIZE, textAlign: "center", fontSize: 11, letterSpacing: 0.5, opacity: 0.6 },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: "center", justifyContent: "center" },
  calDayNum: { fontSize: 15 },
});
