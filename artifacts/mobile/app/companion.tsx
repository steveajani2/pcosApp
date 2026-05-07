import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  role: "elara" | "user";
  text: string;
  ts: number;
};

function getElaraResponse(text: string, checkInCount: number, phase: string, streak: number): string {
  const lower = text.toLowerCase();

  if (lower.includes("bloat") || lower.includes("bloating")) {
    return "Bloating with PCOS often comes from gut inflammation and insulin resistance. Try reducing refined carbs and increasing fiber gradually — fast fiber increases can temporarily worsen bloating. Ginger tea and peppermint are your friends right now.";
  }
  if (lower.includes("tired") || lower.includes("exhausted") || lower.includes("fatigue") || lower.includes("energy")) {
    return "PCOS fatigue is real — it's often tied to blood sugar instability, not laziness. Protein-first meals, consistent sleep times, and short walks after eating can make a noticeable difference. What does your energy look like in the mornings vs afternoons?";
  }
  if (lower.includes("stress") || lower.includes("anxious") || lower.includes("anxiety") || lower.includes("overwhelm")) {
    return "Cortisol directly affects PCOS hormones — stress literally changes your cycle and worsens symptoms. Even five minutes of slow breathing (4 counts in, 6 out) activates your parasympathetic system. You don't have to eliminate stress, just lower your baseline.";
  }
  if (lower.includes("acne") || lower.includes("skin") || lower.includes("breakout")) {
    return "PCOS-related acne is usually androgen-driven. Zinc (pumpkin seeds, beef), spearmint tea, and low-glycemic eating can all help over weeks — not days. It takes patience. Have you noticed any food triggers that precede breakouts?";
  }
  if (lower.includes("craving") || lower.includes("sugar") || lower.includes("carbs")) {
    return "Cravings with PCOS are often blood sugar crashes, not willpower failures. Front-load protein at breakfast — 25g or more. When a craving hits, try a spoonful of almond butter first. It often breaks the cycle without needing to fight it.";
  }
  if (lower.includes("cycle") || lower.includes("period") || lower.includes("irregular")) {
    return "Irregular cycles are one of the hallmarks of PCOS. Tracking your symptoms here is genuinely useful — it helps reveal patterns that single doctor visits miss. Over time, you may notice what makes your cycles shorter or more predictable.";
  }
  if (lower.includes("weight") || lower.includes("lose weight") || lower.includes("insulin")) {
    return "Insulin resistance — not calorie intake — is usually the driver of weight challenges with PCOS. Strength training and a lower-glycemic diet are the most evidence-based approaches. The goal isn't just weight loss but improving insulin sensitivity, which improves almost every PCOS symptom.";
  }
  if (lower.includes("exercise") || lower.includes("workout") || lower.includes("movement")) {
    return "For PCOS, a mix of strength training (2-3x/week) and gentle movement like walking is more effective than cardio alone. Intense daily cardio can raise cortisol and worsen symptoms. Think about exercise as hormone management, not calorie burning.";
  }
  if (lower.includes("sleep") || lower.includes("insomnia") || lower.includes("wake up")) {
    return "Sleep disruption is both a cause and symptom of hormone imbalance in PCOS. Even one hour of sleep debt raises cortisol and insulin resistance the next day. Consistent sleep and wake times — even on weekends — stabilize the hormonal rhythm.";
  }
  if (lower.includes("doctor") || lower.includes("test") || lower.includes("blood") || lower.includes("hormone")) {
    return "When you see your doctor, ask specifically for: testosterone (total and free), DHEA-S, fasting insulin, AMH, and a full thyroid panel — not just TSH. Many PCOS patients are only half-tested. Your symptom log here can help tell a more complete story.";
  }
  if (lower.includes("supplement") || lower.includes("inositol") || lower.includes("vitamin")) {
    return "The most evidence-backed supplements for PCOS include myo-inositol (improves insulin sensitivity and ovulation), magnesium glycinate (reduces cortisol and cravings), and vitamin D (low in most PCOS patients). Always check with your provider before adding new supplements.";
  }
  if (lower.includes("hello") || lower.includes("hi ") || lower === "hi" || lower.includes("hey")) {
    return `Hello — it's good to hear from you. ${checkInCount > 0 ? `You've been tracking for ${checkInCount} days, and that consistency matters.` : "I'm here whenever you need me."} What's on your mind today?`;
  }
  if (lower.includes("thank") || lower.includes("thanks")) {
    return "You're doing meaningful work by paying attention to your body. Most people with PCOS spend years without the information you're building here. Keep going.";
  }
  if (lower.includes("how are you") || lower.includes("how r you")) {
    return "I'm here and focused on you. How are you feeling today? Sometimes just naming it helps.";
  }
  if (lower.includes("pattern") || lower.includes("insight") || lower.includes("data")) {
    return checkInCount >= 7
      ? "Your insights tab is starting to fill in — check there for patterns I've noticed in your symptoms. The longer you track, the more specific those patterns become."
      : `You're at ${checkInCount} check-in${checkInCount !== 1 ? "s" : ""}. Patterns start appearing after 7 days. Keep going — the picture gets much clearer.`;
  }
  if (lower.includes("phase") || lower.includes(`${phase}`)) {
    const phaseMessages: Record<string, string> = {
      menstrual: "You're in your menstrual phase — rest is not a luxury right now, it's biology. Your body is doing real work. Lighter movement, more warmth, and nourishing foods are what serve you best this week.",
      follicular: "The follicular phase brings rising estrogen, which usually means more energy and mental clarity. A great time to challenge yourself, start new projects, or push workouts a bit harder.",
      ovulation: "Around ovulation, energy and confidence often peak. Connection and communication feel easier. Support estrogen metabolism with cruciferous vegetables — especially important with PCOS.",
      luteal: "The luteal phase often brings heightened sensitivity and cravings. B6, magnesium, and zinc-rich foods support progesterone. Protect your sleep carefully this week.",
    };
    return phaseMessages[phase] ?? "Tell me more about what you're experiencing right now and I can share something more specific.";
  }

  if (streak >= 7) {
    return `You've been showing up for ${streak} days straight. That kind of consistency is rare and it matters. What's coming up for you today?`;
  }

  return "I'm listening. Tell me more about what's going on — the more specific you are, the more useful I can be for you.";
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "elara",
    text: "Hello. I'm Elara — your PCOS companion. I'm here to help you understand your patterns, navigate your symptoms, and feel less alone in this. What's on your mind?",
    ts: Date.now(),
  },
];

export default function CompanionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkIns, getStreak, getCyclePhase } = useApp();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef<FlatList<Message>>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: Date.now().toString(), role: "user", text, ts: Date.now() };
    setMessages((prev) => [userMsg, ...prev]);

    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
    setIsTyping(false);

    const phase = getCyclePhase();
    const streak = getStreak();
    const reply = getElaraResponse(text, checkIns.length, phase, streak);
    const elaraMsg: Message = { id: (Date.now() + 1).toString(), role: "elara", text: reply, ts: Date.now() };
    setMessages((prev) => [elaraMsg, ...prev]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isElara = item.role === "elara";
    return (
      <View style={[styles.messageRow, isElara ? styles.messageRowElara : styles.messageRowUser]}>
        {isElara && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>E</Text>
          </View>
        )}
        <View style={[styles.bubble, isElara ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 } : { backgroundColor: colors.primary }]}>
          <Text style={[styles.bubbleText, { color: isElara ? colors.foreground : colors.primaryForeground, fontFamily: "Inter_400Regular" }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.headerAvatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>E</Text>
          </View>
          <View>
            <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Elara</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Your PCOS companion</Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          ListHeaderComponent={
            isTyping ? (
              <View style={[styles.messageRow, styles.messageRowElara]}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>E</Text>
                </View>
                <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Thinking...</Text>
                </View>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === "web" ? 34 : 16) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Elara anything..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.muted, fontFamily: "Inter_400Regular" }]}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            multiline
          />
          <Pressable
            onPress={sendMessage}
            style={({ pressed }) => [styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="send" size={18} color={input.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { fontSize: 15 },
  headerName: { fontSize: 16 },
  headerSub: { fontSize: 12 },
  listContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  messageRowElara: { justifyContent: "flex-start" },
  messageRowUser: { justifyContent: "flex-end" },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 13 },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 14 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  typingText: { fontSize: 14 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
