import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  useColorScheme,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  interpolate,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable } from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { OnboardingTour, TourStep } from "../../components/OnboardingTour";

const { width } = Dimensions.get("window");

const PHASE_INFO = {
  menstrual: {
    label: "Menstrual",
    range: "Days 1–5",
    color: "#D97777",
    bg: "#D9777712",
    description: "Your body is releasing the uterine lining. Estrogen and progesterone are at their lowest.",
    supports: ["Rest without guilt", "Warm foods", "Iron-rich meals"],
    expect: ["Lower energy", "Need for sleep"],
    hormones: { estrogen: "Low", progesterone: "Low" },
  },
  follicular: {
    label: "Follicular",
    range: "Days 6–13",
    color: "#D4956A",
    bg: "#D4956A12",
    description: "Estrogen rises as follicles develop. This is your natural growth phase — energy increases.",
    supports: ["High-intensity exercise", "Fermented foods", "New projects"],
    expect: ["More energy", "Improved mood"],
    hormones: { estrogen: "Rising", progesterone: "Low" },
  },
  ovulation: {
    label: "Ovulation",
    range: "Days 14–16",
    color: "#7ABD98",
    bg: "#7ABD9812",
    description: "Peak estrogen. Your body is designed to feel its best right now. Vitality peaks.",
    supports: ["Cruciferous vegetables", "Peak workouts", "Collaboration"],
    expect: ["High confidence", "Strength peak"],
    hormones: { estrogen: "Peak", progesterone: "Rising" },
  },
  luteal: {
    label: "Luteal",
    range: "Days 17–end",
    color: "#9B7EC8",
    bg: "#9B7EC812",
    description: "Progesterone rises. Your body shifts inward. PMS symptoms and cravings are common.",
    supports: ["Magnesium foods", "Yoga or walking", "Protecting sleep"],
    expect: ["Lower energy", "Appetite rise"],
    hormones: { estrogen: "Moderate", progesterone: "Peak" },
  },
  unknown: {
    label: "Tracking",
    range: "Set cycle start",
    color: "#9C8C86",
    bg: "#9C8C8612",
    description: "Set your cycle start date in settings to see your current phase guidance.",
    supports: [],
    expect: [],
    hormones: { estrogen: "—", progesterone: "—" },
  },
};

function CycleRing({ cycleDay, cycleLength, phase }: { cycleDay: number; cycleLength: number; phase: string }) {
  const colors = useColors();
  const phaseInfo = PHASE_INFO[phase as keyof typeof PHASE_INFO] ?? PHASE_INFO.unknown;
  const progress = cycleDay / cycleLength;
  const size = 260;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const progressAnim = useSharedValue(1); // Starts at 1 (full offset)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withTiming(1, { duration: 1000 });
    progressAnim.value = withTiming(1 - progress, { duration: 1500 });
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  
  const ringAnimStyle = useAnimatedProps(() => ({
    strokeDashoffset: circumference * progressAnim.value,
  }));
  
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <Animated.View style={[ringStyles.container, animStyle]}>
      <Animated.View style={[{ 
        position: 'absolute', 
        width: size - 40, 
        height: size - 40, 
        borderRadius: (size - 40) / 2, 
        backgroundColor: phaseInfo.color,
        shadowColor: phaseInfo.color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        opacity: 0.1
      }, animStyle]} />
      <Svg width={size} height={size} style={ringStyles.svg}>
        <Defs>
            <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={phaseInfo.color} stopOpacity="1" />
                <Stop offset="100%" stopColor={phaseInfo.color} stopOpacity="0.4" />
            </SvgGradient>
            <SvgGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={phaseInfo.color} stopOpacity="0.1" />
                <Stop offset="100%" stopColor="#9B7EC8" stopOpacity="0.05" />
            </SvgGradient>
        </Defs>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#bgGrad)" strokeWidth={strokeWidth} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#grad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={ringAnimStyle}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={ringStyles.center}>
        <Text style={[ringStyles.dayLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>CYCLE DAY</Text>
        <Text style={[ringStyles.dayNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{cycleDay}</Text>
        <View style={[ringStyles.phaseBadge, { backgroundColor: phaseInfo.color + "15" }]}>
           <Text style={[ringStyles.phaseName, { color: phaseInfo.color, fontFamily: "Inter_700Bold" }]}>{phaseInfo.label.toUpperCase()}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function CycleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { getCycleDay, getCyclePhase, settings, updateSettings } = useApp();
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem("@nylaia/tour_seen_cycle").then(v => { if (!v) setShowOnboarding(true); });
  }, []);

  const finishTour = () => {
    AsyncStorage.setItem("@nylaia/tour_seen_cycle", "1");
    setShowOnboarding(false);
  };

  const cycleDay = getCycleDay();
  const phase = getCyclePhase();
  const phaseInfo = PHASE_INFO[phase] ?? PHASE_INFO.unknown;

  const onShare = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: "/create-post",
      params: { 
        initialText: `I'm on Day ${cycleDay} of my cycle (${phaseInfo.label} phase). Currently focusing on ${phaseInfo.supports[0]}! #NylaiaBioSync`,
        initialTribe: phase === "follicular" || phase === "ovulation" ? "Hormones" : "Mindset"
      }
    });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const cycleSteps: TourStep[] = [
      { 
          title: "Phase Tracking", 
          desc: "This ring visualizes your current biological phase and cycle day.",
          pointerTop: 240,
      },
      { 
          title: "Calibration", 
          desc: "Fine-tune your cycle length to align your precision protocols.",
          pointerTop: 560,
      },
      { 
          title: "Community Sync", 
          desc: "Share your current phase and focus with your supportive tribe.",
          pointerTop: 720,
      }
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OnboardingTour
        visible={showOnboarding}
        onFinish={finishTour}
        steps={cycleSteps}
        onStepChange={(step) => {
            if (step === 1) scrollRef.current?.scrollTo({ y: 150, animated: true });
            if (step === 2) scrollRef.current?.scrollToEnd({ animated: true });
        }}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your Progress</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Real-time hormonal synchronization.</Text>
            </View>
            <TouchableOpacity 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowOnboarding(true);
                }}
                style={styles.tourToggle}
            >
                <Feather name="help-circle" size={18} color={colors.foreground} />
            </TouchableOpacity>
        </View>

        <View style={styles.ringSection}>
          <CycleRing cycleDay={cycleDay} cycleLength={settings.cycleLength} phase={phase} />
        </View>

        <Animated.View entering={FadeInDown.delay(100)} style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden', marginBottom: 24 }]}>
            <LinearGradient
                colors={[colors.muted + "40", "transparent"]}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.settingsHeader}>
                <Text style={[styles.settingsTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Cycle Settings</Text>
                <View style={[styles.phaseIconBox, { backgroundColor: colors.muted, width: 32, height: 32 }]}>
                    <Feather name="sliders" size={14} color={colors.mutedForeground} />
                </View>
            </View>
            <View style={styles.settingsRow}>
                <View>
                    <Text style={[styles.settingsLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>CYCLE LENGTH</Text>
                    <Text style={[styles.settingsDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Average duration in days</Text>
                </View>
                <View style={styles.controls}>
                    <TouchableOpacity
                        onPress={() => {
                            if (settings.cycleLength <= 14) return;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            updateSettings({ cycleLength: settings.cycleLength - 1 });
                        }}
                        style={[styles.controlBtn, { backgroundColor: colors.muted, opacity: settings.cycleLength <= 14 ? 0.4 : 1 }]}
                    >
                        <Feather name="minus" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.controlValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{settings.cycleLength}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            if (settings.cycleLength >= 60) return;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            updateSettings({ cycleLength: settings.cycleLength + 1 });
                        }}
                        style={[styles.controlBtn, { backgroundColor: colors.muted, opacity: settings.cycleLength >= 60 ? 0.4 : 1 }]}
                    >
                        <Feather name="plus" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
                colors={[colors.primary + "15", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1 }}>
                <Text style={[styles.shareTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Share your status</Text>
                <Text style={[styles.shareSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Let the sanctuary know how you're feeling today.</Text>
            </View>
            <TouchableOpacity onPress={onShare} style={[styles.shareBtn, { backgroundColor: colors.primary }]}>
                <Feather name="share-2" size={16} color={colors.primaryForeground} />
                <Text style={[styles.shareBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>SHARE</Text>
            </TouchableOpacity>
        </Animated.View>

        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Biological Highlights</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(300)} style={[styles.phaseCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
            <LinearGradient
                colors={[phaseInfo.color + "15", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.phaseHeader}>
                <View style={[styles.phaseIconBox, { backgroundColor: phaseInfo.color + "15" }]}>
                    <Feather name="activity" size={20} color={phaseInfo.color} />
                </View>
                <View>
                    <Text style={[styles.phaseTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{phaseInfo.label} Phase</Text>
                    <Text style={[styles.phaseRange, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{phaseInfo.range.toUpperCase()}</Text>
                </View>
            </View>
            <Text style={[styles.phaseDesc, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{phaseInfo.description}</Text>
        </Animated.View>

        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Hormonal Calibration</Text>
        </View>

        <View style={styles.bentoRow}>
            <Animated.View entering={FadeInDown.delay(400).springify()} style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
                <LinearGradient
                    colors={[phaseInfo.color + "08", "transparent"]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.hormoneRow}>
                    <View style={[styles.hormoneIcon, { backgroundColor: phaseInfo.color + "15" }]}>
                        <Feather name="droplet" size={14} color={phaseInfo.color} />
                    </View>
                    <View>
                        <Text style={[styles.hormoneLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>ESTROGEN</Text>
                        <Text style={[styles.hormoneValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{phaseInfo.hormones.estrogen}</Text>
                    </View>
                </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(500).springify()} style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
                <LinearGradient
                    colors={[colors.primary + "05", "transparent"]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.hormoneRow}>
                    <View style={[styles.hormoneIcon, { backgroundColor: colors.primary + "10" }]}>
                        <Feather name="shield" size={14} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.hormoneLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>PROGESTERONE</Text>
                        <Text style={[styles.hormoneValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{phaseInfo.hormones.progesterone}</Text>
                    </View>
                </View>
            </Animated.View>
        </View>

        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Biological Protocol</Text>
        </View>

        <View style={styles.bentoRow}>
            <Animated.View entering={FadeInDown.delay(600).springify()} style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
                <Text style={[styles.bentoTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Focus</Text>
                {phaseInfo.supports.map((s, i) => (
                    <View key={i} style={styles.listItem}>
                        <Feather name="check-circle" size={12} color={phaseInfo.color} style={{ marginTop: 4 }} />
                        <Text style={[styles.listText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{s}</Text>
                    </View>
                ))}
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(700).springify()} style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
                <Text style={[styles.bentoTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Expect</Text>
                {phaseInfo.expect.map((e, i) => (
                    <View key={i} style={styles.listItem}>
                        <Feather name="info" size={12} color={colors.mutedForeground} style={{ marginTop: 4 }} />
                        <Text style={[styles.listText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{e}</Text>
                    </View>
                ))}
            </Animated.View>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bloom: { position: 'absolute', top: 180, left: width * 0.1, right: width * 0.1, height: width * 0.8, borderRadius: width * 0.4 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 28 },
  title: { fontSize: 26, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 4, opacity: 0.8 },
  ringSection: { alignItems: 'center', marginBottom: 32 },
  shareCard: { borderRadius: 28, padding: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  shareTitle: { fontSize: 18, marginBottom: 4 },
  shareSubtitle: { fontSize: 13 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  shareBtnText: { fontSize: 12 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16 },
  phaseCard: { borderRadius: 28, borderWidth: 1, padding: 20, marginBottom: 16 },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  phaseIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  phaseTitle: { fontSize: 18, letterSpacing: -0.4 },
  phaseRange: { fontSize: 9, letterSpacing: 0.8 },
  phaseDesc: { fontSize: 14, lineHeight: 22 },
  bentoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  bentoCard: { flex: 1, borderRadius: 26, borderWidth: 1, padding: 18, gap: 10 },
  bentoTitle: { fontSize: 14, marginBottom: 2 },
  hormoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hormoneIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hormoneLabel: { fontSize: 8, letterSpacing: 1 },
  hormoneValue: { fontSize: 14, marginTop: -2 },
  listItem: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  listText: { flex: 1, fontSize: 12, lineHeight: 18 },
  settingsCard: { borderRadius: 28, borderWidth: 1, padding: 20 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  settingsTitle: { fontSize: 15 },
  settingsDesc: { fontSize: 13, marginTop: 2, opacity: 0.6 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsLabel: { fontSize: 10, letterSpacing: 0.5 },
  controls: { flexDirection: "row", alignItems: "center", gap: 16 },
  controlBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  controlValue: { fontSize: 20, width: 28, textAlign: "center" },
  tourToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

const ringStyles = StyleSheet.create({
  container: { width: 260, height: 260, alignItems: "center", justifyContent: "center" },
  svg: { position: 'absolute' },
  center: { alignItems: "center" },
  dayLabel: { fontSize: 9, letterSpacing: 1.2, marginBottom: -2 },
  dayNum: { fontSize: 56, letterSpacing: -2 },
  phaseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  phaseName: { fontSize: 10, letterSpacing: 0.8 },
});
