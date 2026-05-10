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
  useColorScheme,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";

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

function RatingSelector({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.ratingContainer}>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = n === value;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => { onChange(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={[
                styles.ratingBox,
                {
                  backgroundColor: isSelected ? color : colors.muted + "20",
                  borderColor: isSelected ? color : colors.border,
                },
              ]}
            >
              <Text style={[styles.ratingText, { color: isSelected ? colors.background : colors.foreground, fontFamily: isSelected ? "Inter_700Bold" : "Inter_400Regular" }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function CheckInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
    try {
        const today = new Date().toISOString().split("T")[0];
        await addCheckIn({ date: today, energy, mood, cravings, bloating, stress, acne, hasPeriod, notes });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Brief delay for the user to see the success state before going back
        setTimeout(() => {
            router.back();
        }, 300);
    } catch (error) {
        console.error("Submit check-in error:", error);
        // Reset to first step or show error if needed, but let's at least catch it
    }
  }

  const currentStep = STEPS[step];
  const stepColor = step === 0 ? "#7ABD98" : step === 1 ? "#D4956A" : step === 2 ? "#9B7EC8" : colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[stepColor + "10", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.progressLabel}>
            <Text style={[styles.stepCounter, { color: colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>{step + 1} / {STEPS.length}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: stepColor }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
        >
          <Animated.View entering={FadeInDown.duration(600)} key={step} style={styles.centerContent}>
            <Text style={[styles.stepLabel, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{currentStep.label}</Text>
            <Text style={[styles.stepSublabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{currentStep.sublabel}</Text>

            <View style={styles.inputSection}>
              {currentStep.key === "energy_mood" && (
                <View style={styles.modernFields}>
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>ENERGY LEVEL</Text>
                  <RatingSelector value={energy} onChange={setEnergy} color={stepColor} />
                  
                  <View style={{ height: 40 }} />
                  
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>EMOTIONAL STATE</Text>
                  <RatingSelector value={mood} onChange={setMood} color={stepColor} />
                </View>
              )}

              {currentStep.key === "physical" && (
                <View style={styles.modernFields}>
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>BLOATING</Text>
                  <RatingSelector value={bloating} onChange={setBloating} color={stepColor} />
                  
                  <View style={{ height: 40 }} />
                  
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>SKIN TEXTURE</Text>
                  <RatingSelector value={acne} onChange={setAcne} color={stepColor} />
                </View>
              )}

              {currentStep.key === "stress_cravings" && (
                <View style={styles.modernFields}>
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>STRESS</Text>
                  <RatingSelector value={stress} onChange={setStress} color={stepColor} />
                  
                  <View style={{ height: 40 }} />
                  
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>CRAVINGS</Text>
                  <RatingSelector value={cravings} onChange={setCravings} color={stepColor} />
                </View>
              )}

              {currentStep.key === "cycle" && (
                <View style={styles.modernFields}>
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>MENSTRUAL FLOW</Text>
                  <View style={styles.toggleRow}>
                    {[false, true].map((val) => (
                      <TouchableOpacity
                        key={String(val)}
                        onPress={() => { setHasPeriod(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                        style={[styles.modernToggle, { backgroundColor: hasPeriod === val ? stepColor : colors.muted + "20", borderColor: hasPeriod === val ? stepColor : colors.border }]}
                      >
                        <Text style={[styles.modernToggleText, { color: hasPeriod === val ? colors.background : colors.foreground, fontFamily: "Inter_700Bold" }]}>{val ? "FLOWING" : "NO FLOW"}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {currentStep.key === "notes" && (
                <View style={styles.modernFields}>
                  <Text style={[styles.modernFieldTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>OBSERVATIONS</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    placeholder="Describe your current bio-state..."
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.modernInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.footerInner}>
            {step > 0 && (
              <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.modernBackBtn}>
                <Feather name="arrow-left" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.primaryBtn, { backgroundColor: stepColor }]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.background, fontFamily: "Inter_700Bold" }]}>
                {step === STEPS.length - 1 ? "FINISH SYNC" : "CONTINUE"}
              </Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, justifyContent: 'space-between' },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  progressTrack: { height: 3, width: "100%" },
  progressFill: { height: 3, borderRadius: 2 },
  progressLabel: { alignItems: 'center' },
  stepCounter: { fontSize: 13, letterSpacing: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },
  centerContent: { alignItems: 'center' },
  stepLabel: { fontSize: 32, textAlign: 'center', letterSpacing: -1, marginBottom: 8 },
  stepSublabel: { fontSize: 16, textAlign: 'center', opacity: 0.6, marginBottom: 60 },
  inputSection: { width: '100%' },
  modernFields: { width: '100%' },
  modernFieldTitle: { fontSize: 10, letterSpacing: 1.5, marginBottom: 16, textAlign: 'center' },
  ratingContainer: { width: '100%' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  ratingBox: { flex: 1, height: 64, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ratingText: { fontSize: 18 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  modernToggle: { flex: 1, height: 64, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modernToggleText: { fontSize: 13, letterSpacing: 1 },
  modernInput: { borderWidth: 1.5, borderRadius: 20, padding: 20, minHeight: 140, fontSize: 16, textAlignVertical: "top" },
  footer: { paddingHorizontal: 32 },
  footerInner: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  modernBackBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  primaryBtn: { flex: 1, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 14, letterSpacing: 1 },
});
