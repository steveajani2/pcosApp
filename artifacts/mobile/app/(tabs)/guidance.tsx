import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { GuidanceItem, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { OnboardingTour, TourStep } from "../../components/OnboardingTour";

const CATEGORY_META: Record<GuidanceItem["category"], { label: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  meals: { label: "Nourishment", icon: "coffee", color: "#D4956A", bg: "#D4956A15" },
  movement: { label: "Movement", icon: "activity", color: "#7ABD98", bg: "#7ABD9815" },
  recovery: { label: "Recovery", icon: "moon", color: "#9B7EC8", bg: "#9B7EC815" },
};

function GuidanceCard({ item, index }: { item: GuidanceItem; index: number }) {
  const colors = useColors();
  const meta = CATEGORY_META[item.category];
  return (
    <Animated.View entering={FadeInUp.delay(index * 100).springify()} style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
      <LinearGradient
        colors={[meta.color + "10", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={gStyles.header}>
        <View style={[gStyles.iconBox, { backgroundColor: meta.bg }]}>
            <Feather name={meta.icon} size={20} color={meta.color} />
        </View>
        <Text style={[gStyles.tag, { color: meta.color, fontFamily: "Inter_600SemiBold" }]}>{meta.label.toUpperCase()}</Text>
      </View>
      <Text style={[gStyles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{item.title}</Text>
      <Text style={[gStyles.cardDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item.description}</Text>
    </Animated.View>
  );
}


function BioSyncModal({ visible, onClose, onStart }: { visible: boolean; onClose: () => void; onStart: () => void }) {
    const colors = useColors();
    if (!visible) return null;
    return (
        <Animated.View entering={FadeInUp} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 1000 }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            <Animated.View entering={FadeInUp.springify()} style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                    <View style={styles.modalIndicator} />
                    <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Bio-Sync Protocol</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Synthesize your physiological data for precision guidance.</Text>
                </View>
                
                <View style={styles.modalBenefits}>
                    {[
                        { icon: "cpu" as const, title: "Precision Synthesis", desc: "Our algorithm adjusts protocols based on real-time symptoms." },
                        { icon: "activity" as const, title: "Cycle Alignment", desc: "Sync your meals and movement with your hormonal phase." },
                        { icon: "shield" as const, title: "Clinical Validity", desc: "Data-driven insights to share with your healthcare provider." },
                    ].map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "10" }]}>
                                <Feather name={b.icon} size={18} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.benefitTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{b.title}</Text>
                                <Text style={[styles.benefitDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{b.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <TouchableOpacity 
                    onPress={onStart}
                    style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                >
                    <Text style={[styles.modalBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>START SYNCHRONIZATION</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                    <Text style={[styles.modalCloseText, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>LATER</Text>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
}

export default function GuidanceScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { getTodayGuidance, getTodayCheckIn } = useApp();

  const guidance = getTodayGuidance();
  const hasCheckIn = !!getTodayCheckIn();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const meals = guidance.filter((g) => g.category === "meals");
  const movement = guidance.filter((g) => g.category === "movement");
  const recovery = guidance.filter((g) => g.category === "recovery");

  const [modalVisible, setModalVisible] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem("@nylaia/tour_seen_guidance").then(v => { if (!v) setShowOnboarding(true); });
  }, []);

  const startCheckIn = () => {
    setModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/checkin");
  };


  const scrollRef = React.useRef<ScrollView>(null);

  const guidanceSteps: TourStep[] = [
      { 
          title: "Sync your bio-data", 
          desc: "Tap here to log how you're feeling. It takes 60 seconds.",
          pointerTop: 240,
      },
      { 
          title: "Your daily protocols", 
          desc: "Personalized meal, movement & recovery plans appear here.",
          pointerTop: 400,
      }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingTour
          visible={showOnboarding}
          onFinish={() => { AsyncStorage.setItem("@nylaia/tour_seen_guidance", "1"); setShowOnboarding(false); }}
          steps={guidanceSteps}
          onStepChange={(step) => {
              if (step === 1) scrollRef.current?.scrollTo({ y: 150, animated: true });
          }}
      />
      <BioSyncModal visible={modalVisible} onClose={() => setModalVisible(false)} onStart={startCheckIn} />
      
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Clinical Guidance</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {hasCheckIn ? "Precision protocols for your current bio-state." : "Initialize check-in for personalized synthesis."}
                </Text>
            </View>
            <TouchableOpacity 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowOnboarding(true);
                }}
                style={[styles.tourToggle, { backgroundColor: colors.muted }]}
            >
                <Feather name="help-circle" size={18} color={colors.foreground} />
            </TouchableOpacity>
        </View>

        {!hasCheckIn && (
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={[styles.checkInBanner, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}
            >
                <LinearGradient
                    colors={["#9B7EC820", "#7ABD9815"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.bannerIconBox, { backgroundColor: colors.primary }]}>
                    <Feather name="refresh-cw" size={20} color={colors.primaryForeground} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.bannerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Sync Bio-Data</Text>
                    <Text style={[styles.bannerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>60s log required for protocol synthesis.</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
        )}

        {meals.length > 0 && (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Nourishment</Text>
                {meals.map((item, i) => <GuidanceCard key={item.id} item={item} index={i} />)}
            </View>
        )}

        {movement.length > 0 && (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Movement</Text>
                {movement.map((item, i) => <GuidanceCard key={item.id} item={item} index={i} />)}
            </View>
        )}

        {recovery.length > 0 && (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Recovery</Text>
                {recovery.map((item, i) => <GuidanceCard key={item.id} item={item} index={i} />)}
            </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 28 },
  title: { fontSize: 26, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 4, opacity: 0.8 },
  checkInBanner: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 26, padding: 20, marginBottom: 28 },
  bannerTitle: { fontSize: 16 },
  bannerText: { fontSize: 13, marginTop: 2 },
  bannerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, letterSpacing: -0.4, marginBottom: 16 },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { alignItems: 'center', marginBottom: 32 },
  modalIndicator: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.1)', marginBottom: 20 },
  modalTitle: { fontSize: 24, letterSpacing: -1, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, opacity: 0.8 },
  modalBenefits: { gap: 20, marginBottom: 32 },
  benefitRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontSize: 15 },
  benefitDesc: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  modalBtn: { paddingVertical: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 14, letterSpacing: 0.5 },
  modalCloseBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 13, opacity: 0.6 },
  tourInstructionZone: { position: 'absolute', left: 40, right: 40, alignItems: 'center', zIndex: 2000 },
  tourTitle: { fontSize: 28, letterSpacing: -1.2, textAlign: 'center' },
  tourDesc: { fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  tourFooter: { position: 'absolute', left: 40, right: 40, alignItems: 'center' },
  tourPrimaryBtn: { width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tourPrimaryBtnText: { fontSize: 13, letterSpacing: 1.5 },
  pointerHand: { position: 'absolute', zIndex: 2001, alignItems: 'center' },
  pointerPulse: { position: 'absolute', width: 16, height: 16, borderRadius: 8, opacity: 0.4 },
  tourToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

const gStyles = StyleSheet.create({
  card: { borderRadius: 28, borderWidth: 1, padding: 20, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tag: { fontSize: 9, letterSpacing: 0.8 },
  cardTitle: { fontSize: 16, letterSpacing: -0.3, marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 22 },
});
