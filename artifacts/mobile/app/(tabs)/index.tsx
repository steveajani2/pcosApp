import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  useColorScheme,
} from "react-native";
import Animated, {
  FadeInUp,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  withDelay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { AssistantButton } from "../../components/AssistantButton";
import { OnboardingTour, TourStep } from "../../components/OnboardingTour";

const { width, height } = Dimensions.get("window");

const GREETINGS = ["Good morning", "Good afternoon", "Good evening"];
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 17) return GREETINGS[1];
  return GREETINGS[2];
}

const MESH_COLORS = ["#FFFFFF", "#FFFFFF", "#FFFFFF"];
const MESH_COLORS_DARK = ["#0A0A0A", "#120E0F", "#050505"];

const PHASE_LABELS: Record<string, { label: string; color: string; desc: string; icon: string }> = {
  menstrual: { label: "Menstrual", color: "#D97777", desc: "Deep Rest", icon: "moon" },
  follicular: { label: "Follicular", color: "#D4956A", desc: "Rising Energy", icon: "zap" },
  ovulation: { label: "Ovulation", color: "#7ABD98", desc: "Peak Vitality", icon: "sun" },
  luteal: { label: "Luteal", color: "#9B7EC8", desc: "Slow Down", icon: "cloud" },
  unknown: { label: "Cycle", color: "#9C8C86", desc: "Track Status", icon: "activity" },
};

function SymptomMiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={mStyles.miniBar}>
      <Text style={[mStyles.miniLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <View style={[mStyles.miniTrack, { backgroundColor: colors.muted }]}>
        <View style={[mStyles.miniFill, { width: `${(value / 5) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { settings, getTodayCheckIn, getStreak, getCycleDay, getCyclePhase } = useApp();

  useEffect(() => {
    // Grid entry cascade
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.1,
    shadowRadius: 10,
    transform: [{ scale: 1 }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [{ scale: 1 }],
  }));

  const todayCheckIn = getTodayCheckIn();
  const streak = getStreak();
  const cycleDay = getCycleDay();
  const phase = getCyclePhase();
  const phaseInfo = PHASE_LABELS[phase];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  const name = settings.name ? settings.name.split(" ")[0] : "there";
  
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [featuredPost, setFeaturedPost] = React.useState<{ title: string; body: string; author_name: string } | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem("@nylaia/tour_seen_home").then(v => { if (!v) setShowOnboarding(true); });
  }, []);

  useFocusEffect(React.useCallback(() => {
    supabase.from("posts").select("title, body, author_name").order("created_at", { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setFeaturedPost(data); });
  }, []));

  const finishTour = () => {
    AsyncStorage.setItem("@nylaia/tour_seen_home", "1");
    setShowOnboarding(false);
  };

  const homeSteps: TourStep[] = [
      { 
          title: "Current Phase", 
          desc: "This hero card shows your active biological phase and exact cycle day.",
          pointerTop: 160,
      },
      { 
          title: "Daily Action", 
          desc: "Tap here to complete your daily check-in and unlock your synthesis.",
          pointerTop: 360,
      }
  ];

  if (todayCheckIn) {
      homeSteps[1] = {
          title: "Today's Synthesis",
          desc: "Your daily bio-data has been recorded. Review your summary here.",
          pointerTop: 360,
      };
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <OnboardingTour
          visible={showOnboarding}
          onFinish={finishTour}
          steps={homeSteps}
          onStepChange={(step) => {
              if (step === 1) scrollRef.current?.scrollTo({ y: 150, animated: true });
          }}
      />
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <LinearGradient
          colors={isDark ? MESH_COLORS_DARK as any : MESH_COLORS as any}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.meshOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.4)" }]} />
      </Animated.View>

      <LinearGradient
        colors={isDark ? MESH_COLORS_DARK as any : MESH_COLORS as any}
        style={[styles.gradient, { height: 450 + topPad }]}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(100).springify()} style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {getGreeting().toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {name}
            </Text>
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
              <TouchableOpacity
                  onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push("/settings");
                  }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}
              >
                  <Feather name="settings" size={18} color={colors.foreground} />
              </TouchableOpacity>
              <AssistantButton />
          </View>
        </Animated.View>

        <View style={styles.bentoGrid}>
          {/* Main Hero Card: Current Phase */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.heroWrapper, heroStyle]}>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/cycle")}
              activeOpacity={0.9}
              style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <LinearGradient
                colors={[phaseInfo.color + "25", phaseInfo.color + "05", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroContent}>
                <View style={[styles.heroIconBox, { backgroundColor: phaseInfo.color + "20" }]}>
                   <Feather name={phaseInfo.icon as any} size={28} color={phaseInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>CURRENT PHASE</Text>
                  <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{phaseInfo.label}</Text>
                  <Text style={[styles.heroSubtitle, { color: phaseInfo.color, fontFamily: "Inter_500Medium" }]}>{phaseInfo.desc}</Text>
                </View>
                <View style={[styles.heroDayBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: colors.border }]}>
                  <Text style={[styles.heroDayValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{cycleDay}</Text>
                  <Text style={[styles.heroDayLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>DAY</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.statsGrid}>
          <Animated.View entering={FadeInUp.delay(300).springify()}>
             <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNum, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{streak}</Text>
                <Text style={[styles.statTag, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>STREAK</Text>
             </View>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(400).springify()}>
             <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statNum, { color: "#7ABD98", fontFamily: "Inter_700Bold" }]}>{settings.cycleLength}</Text>
                <Text style={[styles.statTag, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>TARGET</Text>
             </View>
          </Animated.View>
          </View>

          {/* Dynamic Check-in Section */}
          <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.mainActionWrapper}>
            {!todayCheckIn ? (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/checkin"); }}
                activeOpacity={0.9}
                style={[styles.actionCard, { backgroundColor: colors.primary }]}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)" }]}>
                    <Feather name="sun" size={24} color={isDark ? colors.primaryForeground : "#fff"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionTitle, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>Daily Check-in</Text>
                    <Text style={[styles.actionSubtitle, { color: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular" }]}>60 seconds to sync your protocols</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.primaryForeground} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryHeader}>
                  <Text style={[styles.summaryTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Today's Synthesis</Text>
                  <TouchableOpacity onPress={() => router.push("/checkin")}>
                    <Text style={[styles.editBtn, { color: colors.tint, fontFamily: "Inter_600SemiBold" }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.barsGrid}>
                  <SymptomMiniBar label="Energy" value={todayCheckIn.energy} color={colors.tint} />
                  <SymptomMiniBar label="Mood" value={todayCheckIn.mood} color={colors.primary} />
                </View>
              </View>
            )}
          </Animated.View>

          {/* Secondary Bento Grid */}
          <View style={styles.secondaryGrid}>
            <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.secondaryCardWrapper}>
               <TouchableOpacity
                 onPress={() => router.push("/(tabs)/guidance")}
                 activeOpacity={0.8}
                 style={[styles.bentoSmall, { backgroundColor: colors.card, borderColor: colors.border }]}
               >
                 <View style={styles.bentoIcon}>
                    <LinearGradient
                        colors={['#FDEEF2', '#F2F5FF', '#F0FFF4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                   <Feather name="zap" size={20} color={colors.tint} />
                 </View>
                 <Text style={[styles.bentoTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Protocols</Text>
                 <Text style={[styles.bentoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Personalized advice</Text>
               </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(700).springify()} style={styles.secondaryCardWrapper}>
                 <TouchableOpacity
                   onPress={() => router.push("/(tabs)/community")}
                   activeOpacity={0.8}
                   style={[styles.bentoSmall, { backgroundColor: colors.card, borderColor: colors.border }]}
                 >
                   <View style={styles.bentoIcon}>
                    <LinearGradient
                        colors={['#FDEEF2', '#F2F5FF', '#F0FFF4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                     <Feather name="users" size={20} color="#9B7EC8" />
                   </View>
                   <Text style={[styles.bentoTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Community</Text>
                   <Text style={[styles.bentoDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Connect & Share</Text>
                 </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Community Faves Section */}
          <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.spotlightSection}>
             <View style={styles.spotlightHeader}>
                <Text style={[styles.spotlightTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Community Faves</Text>
                <TouchableOpacity onPress={() => router.push("/all-posts")}>
                    <Text style={[styles.spotlightLink, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>SEE ALL</Text>
                </TouchableOpacity>
             </View>

             <TouchableOpacity
               onPress={() => router.push("/all-posts")}
               activeOpacity={0.9}
               style={[styles.spotlightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
             >
               {featuredPost ? (
                 <>
                   <View style={[styles.spotlightBadge, { backgroundColor: colors.primary + "15" }]}>
                     <Text style={[styles.spotlightBadgeText, { color: colors.primary, fontFamily: "Inter_800ExtraBold" }]}>LATEST POST</Text>
                   </View>
                   <Text style={[styles.spotlightText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                     {featuredPost.title || featuredPost.body.slice(0, 80)}
                   </Text>
                   <View style={styles.spotlightFooter}>
                     <View style={styles.spotlightUser}>
                       <View style={[styles.avatarMicro, { backgroundColor: colors.muted }]}>
                         <Text style={{ fontSize: 7, color: colors.mutedForeground }}>{(featuredPost.author_name?.[0] ?? "?").toUpperCase()}</Text>
                       </View>
                       <Text style={[styles.spotlightUserName, { color: colors.mutedForeground }]}>{featuredPost.author_name}</Text>
                     </View>
                     <Feather name="arrow-right" size={12} color={colors.mutedForeground} />
                   </View>
                 </>
               ) : (
                 <View style={{ alignItems: "center", paddingVertical: 8 }}>
                   <Feather name="users" size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                   <Text style={[styles.spotlightText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" }]}>
                     Be the first to share wisdom with the community
                   </Text>
                 </View>
               )}
             </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  meshOverlay: { position: 'absolute', top: -100, left: -100, right: -100, bottom: -100, opacity: 0.3 },
  gradient: { position: "absolute", top: 0, left: 0, right: 0 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  greeting: { fontSize: 9, letterSpacing: 1.2, marginBottom: 2 },
  title: { fontSize: 26, letterSpacing: -0.8 },
  morphBox: { height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", overflow: 'hidden' },
  glowLayer: { position: 'absolute', borderRadius: 80 },
  morphContent: { width: '100%', height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  iconCenterer: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  morphText: { fontSize: 12, letterSpacing: -0.2 },
  profileBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  bentoGrid: { gap: 12 },
  heroWrapper: { width: '100%' },
  heroCard: { borderRadius: 28, borderWidth: 1, padding: 20, overflow: 'hidden' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroIconBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 9, letterSpacing: 0.8, marginBottom: 4 },
  heroTitle: { fontSize: 20, letterSpacing: -0.4 },
  heroSubtitle: { fontSize: 13, marginTop: 2 },
  heroDayBadge: { alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 16, borderWidth: 1 },
  heroDayValue: { fontSize: 20 },
  heroDayLabel: { fontSize: 8, marginTop: -2 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statWrapper: { flex: 1 },
  miniStat: { borderRadius: 22, borderWidth: 1, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 24, letterSpacing: -0.5 },
  statTag: { fontSize: 9, letterSpacing: 0.8, marginTop: 4 },
  mainActionWrapper: { width: '100%' },
  actionCard: { borderRadius: 26, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
  actionContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 17 },
  actionSubtitle: { fontSize: 13, marginTop: 2 },
  summaryCard: { borderRadius: 26, borderWidth: 1, padding: 20 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  summaryTitle: { fontSize: 15 },
  editBtn: { fontSize: 13 },
  barsGrid: { gap: 12 },
  secondaryGrid: { flexDirection: 'row', gap: 10 },
  secondaryCardWrapper: { flex: 1 },
  bentoSmall: { borderRadius: 26, borderWidth: 1, padding: 18 },
  bentoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' },
  bentoTitle: { fontSize: 15 },
  bentoDesc: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  spotlightSection: { marginTop: 12 },
  spotlightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  spotlightTitle: { fontSize: 16, letterSpacing: -0.4 },
  spotlightLink: { fontSize: 11, letterSpacing: 0.5 },
  spotlightCard: { borderRadius: 24, borderWidth: 1, padding: 18 },
  spotlightBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  spotlightBadgeText: { fontSize: 8, letterSpacing: 1 },
  spotlightText: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  spotlightFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotlightUser: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarMicro: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  spotlightUserName: { fontSize: 11 },
  spotlightLikes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spotlightLikeCount: { fontSize: 11 },
});

const mStyles = StyleSheet.create({
  miniBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  miniLabel: { width: 50, fontSize: 11 },
  miniTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 3 },
});
