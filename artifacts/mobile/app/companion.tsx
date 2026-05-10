import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Message = {
  id: string;
  role: "nylaia" | "user";
  text: string;
};

const WELCOME: Message = {
  id: "welcome",
  role: "nylaia",
  text: "Hello. I'm Nylaia — your PCOS companion. I'm here to help you understand your symptoms, navigate your condition, and feel less alone in this. What's on your mind today?",
};

function getResponse(message: string, phase: string, checkIn: any): string {
  const lower = message.toLowerCase();

  if (lower.match(/stress|anxious|anxiety|overwhelm|cortisol/)) {
    return "Stress is one of the biggest disruptors of hormonal balance in PCOS. Elevated cortisol directly spikes insulin and androgens. Try box breathing (4 counts in, 4 hold, 4 out, 4 hold) for 5 minutes before bed. A 20-minute walk after meals lowers cortisol more effectively than most supplements.";
  }
  if (lower.match(/diet|food|eat|meal|nutrition|bloat|craving/)) {
    return "For PCOS, a low-glycemic approach is most evidence-backed. Lead every meal with 25-30g of protein before adding carbs — this stabilises blood sugar, which drives most PCOS symptoms. Spearmint tea twice daily has also shown real benefits for androgen levels. Avoid eating large meals late in the evening.";
  }
  if (lower.match(/sleep|tired|fatigue|exhaust|energy/)) {
    return "Poor sleep raises cortisol and worsens insulin resistance — both of which directly worsen PCOS. Prioritize getting to bed before 11pm. Magnesium glycinate (200-400mg) before sleep helps many women with PCOS improve sleep quality. Avoid screens 1 hour before bed.";
  }
  if (lower.match(/exercise|workout|gym|movement|walk/)) {
    return "For PCOS, resistance training is the most effective type of movement — it improves insulin sensitivity long-term. Walking 10 minutes after meals is also highly effective. Avoid high-intensity cardio daily, as it can spike cortisol. Align your workouts with your cycle phase: high-intensity in follicular and ovulation, gentler in luteal and menstrual.";
  }
  if (lower.match(/weight|fat|bmi|belly|waist/)) {
    return "Weight changes in PCOS are mostly driven by insulin resistance, not just calorie intake. Reducing processed carbs and increasing protein is more effective than cutting calories. Strength training 3x weekly builds muscle that acts as a \"glucose sink,\" improving insulin sensitivity. Be patient — hormonal weight is slower to shift but does respond to consistent lifestyle changes.";
  }
  if (lower.match(/skin|acne|hair|hirsut|androgens|testosterone/)) {
    return "Elevated androgens — often the cause of acne and excess hair growth in PCOS — are driven by insulin resistance. Reducing sugar, refined carbs, and dairy often helps. Spearmint tea (2 cups daily) has clinical evidence for lowering free testosterone. Inositol supplements (especially Ovasitol) also show strong results for androgen reduction.";
  }
  if (lower.match(/period|irregular|cycle|menstrual|ovulation|fertility/)) {
    return "Irregular cycles in PCOS are usually caused by anovulation — the follicle doesn't release an egg. The most impactful levers are reducing insulin resistance (diet, exercise, inositol) and managing stress (cortisol disrupts the LH surge needed for ovulation). Tracking your cycle in this app will help identify patterns over time.";
  }
  if (lower.match(/supplement|myo.inositol|ovasitol|vitamin|magnesium|zinc/)) {
    return "The most evidence-backed supplements for PCOS are: Myo-inositol + D-chiro-inositol (40:1 ratio, like Ovasitol) for insulin resistance and ovulation, Magnesium glycinate for cortisol and sleep, Vitamin D3 (most PCOS women are deficient), and Zinc for androgens and acne. Always check with your doctor before starting new supplements.";
  }
  if (lower.match(/doctor|gp|specialist|medication|metformin|contraceptive|pill/)) {
    return "Working with a PCOS-informed endocrinologist or gynaecologist is important. Common treatments include metformin (for insulin resistance), combined oral contraceptives (for cycle regulation and androgen management), and letrozole (for ovulation induction). Document your symptoms using the check-in feature so you have data to share at your appointment.";
  }
  if (lower.match(/feel|mood|sad|depressed|low|emot/)) {
    return "PCOS has a strong link to mood — elevated androgens, blood sugar swings, and sleep disruption all affect serotonin and dopamine. You're not imagining it. Consistent tracking will help you spot patterns. Many women find their mood improves significantly when blood sugar is stable. If you're consistently struggling, please speak with your doctor or a therapist.";
  }
  if (lower.match(/hello|hi|hey|how are|good morning|good afternoon|good evening/)) {
    return `Hi! I'm here with you. ${phase !== "unknown" ? `You're currently in your ${phase} phase — ${getPhaseNote(phase)}` : "Log your first check-in to unlock personalized phase guidance."} What would you like to talk about today?`;
  }
  if (lower.match(/thank|thanks|helpful|good|great|perfect/)) {
    return "I'm glad that was helpful. Remember, managing PCOS is a long game — small, consistent changes compound over time. Keep logging your symptoms and I'll continue to reflect patterns back to you. You're doing great.";
  }

  // Contextual fallback using check-in data
  if (checkIn) {
    if (checkIn.stress >= 4) {
      return `Based on your recent check-in, your stress is elevated. That's worth addressing first — high cortisol disrupts nearly every PCOS symptom. Is there something specific that's been stressing you lately, or would you like some strategies for managing it?`;
    }
    if (checkIn.energy <= 2) {
      return `I see your energy has been low recently. In the ${phase} phase, that's not unusual, but it's worth looking at sleep quality and blood sugar stability. What does your morning routine look like — are you eating breakfast within an hour of waking?`;
    }
  }

  return `That's a great question. While AI-powered personalised responses are coming soon, I can share that many of the answers to PCOS challenges come from understanding your own patterns. Keep logging your daily symptoms — the data you're building is genuinely valuable for both self-understanding and for conversations with your healthcare provider.\n\nIs there a specific aspect of PCOS you'd like to understand better? I can share evidence-based guidance on nutrition, movement, supplements, sleep, or hormones.`;
}

function getPhaseNote(phase: string): string {
  const notes: Record<string, string> = {
    menstrual: "rest is a priority right now.",
    follicular: "your energy is rising — good time for new goals.",
    ovulation: "you're at peak vitality.",
    luteal: "your body may need extra support and nourishment.",
  };
  return notes[phase] ?? "";
}

export default function CompanionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkIns, getCyclePhase } = useApp();

  const phase = getCyclePhase();
  const latestCheckIn = checkIns[0] ?? null;

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef<FlatList<Message>>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function sendMessage() {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages(prev => [userMsg, ...prev]);
    setIsTyping(true);

    // Simulate a short typing delay for natural feel
    setTimeout(() => {
      const reply = getResponse(text, phase, latestCheckIn);
      const nylaiaMsg: Message = { id: (Date.now() + 1).toString(), role: "nylaia", text: reply };
      setMessages(prev => [nylaiaMsg, ...prev]);
      setIsTyping(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 800);
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isNylaia = item.role === "nylaia";
    return (
      <View style={[styles.messageRow, isNylaia ? styles.rowNylaia : styles.rowUser]}>
        {isNylaia && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>N</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isNylaia
            ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
            : { backgroundColor: colors.primary },
        ]}>
          <Text style={[styles.bubbleText, { color: isNylaia ? colors.foreground : colors.primaryForeground, fontFamily: "Inter_400Regular" }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.headerAvatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>N</Text>
          </View>
          <View>
            <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Nylaia</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: "#7ABD98" }]} />
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Your PCOS companion</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => setMessages([WELCOME])} style={styles.newChatBtn}>
          <Feather name="edit" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* AI coming soon banner */}
      <View style={[styles.banner, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        <Feather name="zap" size={12} color={colors.primary} />
        <Text style={[styles.bannerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Personalised AI responses are coming soon — sharing evidence-based guidance for now
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={m => m.id}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListFooterComponent={isTyping ? (
            <View style={[styles.messageRow, styles.rowNylaia]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>N</Text>
              </View>
              <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[styles.bubbleText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Typing...</Text>
              </View>
            </View>
          ) : null}
        />

        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === "web" ? 34 : 16) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Nylaia anything about PCOS..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.muted, fontFamily: "Inter_400Regular" }]}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            multiline
            editable={!isTyping}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || isTyping}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: input.trim() && !isTyping ? colors.primary : colors.muted, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={input.trim() && !isTyping ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 6 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { fontSize: 13 },
  headerName: { fontSize: 13 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  headerSub: { fontSize: 11 },
  newChatBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  bannerText: { flex: 1, fontSize: 11, lineHeight: 16 },
  listContent: { padding: 14, gap: 12, paddingBottom: 8 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowNylaia: { justifyContent: "flex-start" },
  rowUser: { justifyContent: "flex-end" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 },
  avatarText: { fontSize: 11 },
  bubble: { maxWidth: "82%", borderRadius: 20, padding: 12 },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100, minHeight: 40 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
