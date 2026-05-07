import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Step = { key: string; label: string; sublabel: string };

const STEPS: Step[] = [
  { key: "energy_mood", label: "How are you feeling?", sublabel: "Energy and emotional state" },
  { key: "physical", label: "Physical symptoms", sublabel: "Bloating and skin" },
  { key: "stress_cravings", label: "Mind and appetite", sublabel: "Stress and cravings" },
  { key: "cycle", label: "Cycle check", sublabel: "Period and cycle tracking" },
  { key: "notes", label: "Anything else?", sublabel: "Optional notes" },
];

function RatingSelector({ value, onChange, lowLabel, highLabel }: { value: number; onChange: (v: number) => void; lowLabel: string; highLabel: string }) {
  const colors = useColors();
  return (
    <View style={styles.ratingContainer}>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => { onChange(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.ratingDot,
              {
                backgroundColor: n <= value ? colors.primary : colors.muted,
                borderColor: n <= value ? colors.primary : colors.border,
                transform: [{ scale: n === value ? 1.15 : 1 }],
              },
            ]}
          >
            <Text style={[styles.ratingDotText, { color: n <= value ? colors.primaryForeground : colors.mutedForeground }]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.ratingLabels}>
        <Text style={[styles.ratingLabel, { color: colors.mutedForeground }]}>{lowLabel}</Text>
        <Text style={[styles.ratingLabel, { color: colors.mutedForeground }]}>{highLabel}</Text>
      </View>
    </View>
  );
}

export default function CheckInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addCheckIn } = useApp();

  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [bloating, setBloating] = useState(1);
  const [acne, setAcne] = useState(1);
  const [stress, setStress] = useState(1);
  const [cravings, setCravings] = useState(1);
  const [hasPeriod, setHasPeriod] = useState(false);
  const [notes, setNotes] = useState("");

  const progress = (step + 1) / STEPS.length;

  async function handleNext() {
    if (step < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  }

  async function handleSubmit() {
    const today = new Date().toISOString().split("T")[0];
    await addCheckIn({ date: today, energy, mood, cravings, bloating, stress, acne, hasPeriod, notes });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const currentStep = STEPS[step];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.stepCounter, { color: colors.mutedForeground }]}>{step + 1}/{STEPS.length}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.stepHeader}>
            <Text style={[styles.stepLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{currentStep.label}</Text>
            <Text style={[styles.stepSublabel, { color: colors.mutedForeground }]}>{currentStep.sublabel}</Text>
          </View>

          {currentStep.key === "energy_mood" && (
            <View style={styles.fields}>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Energy level</Text>
                <RatingSelector value={energy} onChange={setEnergy} lowLabel="Exhausted" highLabel="Energized" />
              </View>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Mood</Text>
                <RatingSelector value={mood} onChange={setMood} lowLabel="Low" highLabel="Great" />
              </View>
            </View>
          )}

          {currentStep.key === "physical" && (
            <View style={styles.fields}>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Bloating</Text>
                <RatingSelector value={bloating} onChange={setBloating} lowLabel="None" highLabel="Severe" />
              </View>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Skin / acne</Text>
                <RatingSelector value={acne} onChange={setAcne} lowLabel="Clear" highLabel="Breaking out" />
              </View>
            </View>
          )}

          {currentStep.key === "stress_cravings" && (
            <View style={styles.fields}>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Stress</Text>
                <RatingSelector value={stress} onChange={setStress} lowLabel="Calm" highLabel="Overwhelmed" />
              </View>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Cravings</Text>
                <RatingSelector value={cravings} onChange={setCravings} lowLabel="None" highLabel="Intense" />
              </View>
            </View>
          )}

          {currentStep.key === "cycle" && (
            <View style={styles.fields}>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Period today?</Text>
                <View style={styles.toggleRow}>
                  {[false, true].map((val) => (
                    <TouchableOpacity
                      key={String(val)}
                      onPress={() => { setHasPeriod(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.toggleBtn, { backgroundColor: hasPeriod === val ? colors.primary : colors.muted, borderColor: hasPeriod === val ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.toggleBtnText, { color: hasPeriod === val ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{val ? "Yes" : "No"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {currentStep.key === "notes" && (
            <View style={styles.fields}>
              <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fieldTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Notes</Text>
                <Text style={[styles.notesHint, { color: colors.mutedForeground }]}>Anything specific — food, sleep, symptoms, or how your day went</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Type here..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, flex: step > 0 ? 1 : undefined, marginLeft: step > 0 ? 12 : 0 }]}
        >
          <Text style={[styles.nextBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
            {step === STEPS.length - 1 ? "Save check-in" : "Continue"}
          </Text>
          {step < STEPS.length - 1 && <Feather name="arrow-right" size={18} color={colors.primaryForeground} style={{ marginLeft: 6 }} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  progressBarOuter: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E8DDD7", overflow: "hidden" },
  progressBarInner: { height: "100%", borderRadius: 2 },
  stepCounter: { fontSize: 13, width: 32, textAlign: "right", fontFamily: "Inter_400Regular" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  stepHeader: { marginBottom: 28 },
  stepLabel: { fontSize: 26, marginBottom: 6 },
  stepSublabel: { fontSize: 15 },
  fields: { gap: 16 },
  fieldCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  fieldTitle: { fontSize: 16, marginBottom: 16 },
  ratingContainer: { gap: 8 },
  ratingRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  ratingDot: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  ratingDotText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  ratingLabels: { flexDirection: "row", justifyContent: "space-between" },
  ratingLabel: { fontSize: 12 },
  toggleRow: { flexDirection: "row", gap: 12 },
  toggleBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  toggleBtnText: { fontSize: 16 },
  notesHint: { fontSize: 13, marginBottom: 12 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 120, fontSize: 15, textAlignVertical: "top" },
  footer: { padding: 20, flexDirection: "row", borderTopWidth: 1, alignItems: "center" },
  backBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  nextBtn: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", flexDirection: "row", paddingHorizontal: 28, minWidth: 180 },
  nextBtnText: { fontSize: 16 },
});
