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
import { supabase } from "@/lib/supabase";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const HAS_AI_BACKEND = API_URL.length > 0 && !API_URL.includes("your-backend-domain");

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: "nylaia" | "user";
  text: string;
  streaming?: boolean;
};

// ─── Static fallback responses ────────────────────────────────────────────────
function getStaticResponse(message: string, phase: string, checkIn: any): string {
  const lower = message.toLowerCase();

  if (lower.match(/stress|anxious|anxiety|overwhelm|cortisol/))
    return "Stress is one of the biggest disruptors of hormonal balance in PCOS. Elevated cortisol directly spikes insulin and androgens. Try box breathing (4 counts in, 4 hold, 4 out, 4 hold) for 5 minutes before bed. A 20-minute walk after meals lowers cortisol more effectively than most supplements.";
  if (lower.match(/diet|food|eat|meal|nutrition|bloat|craving/))
    return "For PCOS, a low-glycemic approach is most evidence-backed. Lead every meal with 25-30g of protein before adding carbs — this stabilises blood sugar, which drives most PCOS symptoms. Spearmint tea twice daily has also shown real benefits for androgen levels.";
  if (lower.match(/sleep|tired|fatigue|exhaust|energy/))
    return "Poor sleep raises cortisol and worsens insulin resistance — both of which directly worsen PCOS. Prioritize getting to bed before 11pm. Magnesium glycinate (200-400mg) before sleep helps many women with PCOS improve sleep quality.";
  if (lower.match(/exercise|workout|gym|movement|walk/))
    return "For PCOS, resistance training is the most effective type of movement — it improves insulin sensitivity long-term. Walking 10 minutes after meals is also highly effective. Avoid high-intensity cardio daily, as it can spike cortisol.";
  if (lower.match(/weight|fat|bmi|belly|waist/))
    return "Weight changes in PCOS are mostly driven by insulin resistance, not just calorie intake. Reducing processed carbs and increasing protein is more effective than cutting calories. Strength training 3x weekly builds muscle that acts as a glucose sink.";
  if (lower.match(/skin|acne|hair|hirsut|androgen|testosterone/))
    return "Elevated androgens — often the cause of acne and excess hair growth in PCOS — are driven by insulin resistance. Spearmint tea (2 cups daily) has clinical evidence for lowering free testosterone. Inositol supplements (especially Ovasitol) also show strong results.";
  if (lower.match(/period|irregular|cycle|menstrual|ovulation|fertility/))
    return "Irregular cycles in PCOS are usually caused by anovulation. The most impactful levers are reducing insulin resistance (diet, exercise, inositol) and managing stress. Tracking your cycle in this app will help identify patterns over time.";
  if (lower.match(/supplement|inositol|ovasitol|vitamin|magnesium|zinc/))
    return "The most evidence-backed supplements for PCOS: Myo-inositol + D-chiro-inositol (40:1 ratio, like Ovasitol), Magnesium glycinate, Vitamin D3, and Zinc for androgens and acne. Always check with your doctor before starting new supplements.";
  if (lower.match(/doctor|gp|specialist|medication|metformin|contraceptive|pill/))
    return "Working with a PCOS-informed endocrinologist or gynaecologist is important. Common treatments include metformin (insulin resistance), combined oral contraceptives (cycle regulation), and letrozole (ovulation induction). Document your symptoms here to share at your appointment.";
  if (lower.match(/feel|mood|sad|depressed|low|emot/))
    return "PCOS has a strong link to mood — elevated androgens, blood sugar swings, and sleep disruption all affect serotonin and dopamine. You're not imagining it. Many women find their mood improves significantly when blood sugar is stable.";
  if (lower.match(/hello|hi|hey|how are|good morning|good afternoon|good evening/))
    return `Hi! I'm here with you. ${phase !== "unknown" ? `You're in your ${phase} phase — ${getPhaseNote(phase)}` : "Log your first check-in to unlock personalised phase guidance."} What would you like to talk about?`;
  if (lower.match(/thank|thanks|helpful|good|great|perfect/))
    return "I'm glad that was helpful. Managing PCOS is a long game — small, consistent changes compound over time. Keep logging your symptoms and I'll continue reflecting patterns back to you. You're doing great.";

  if (checkIn?.stress >= 4)
    return `Based on your recent check-in, your stress is elevated. High cortisol disrupts nearly every PCOS symptom. Is there something specific stressing you, or would you like strategies for managing it?`;
  if (checkIn?.energy <= 2)
    return `I see your energy has been low recently. In the ${phase} phase that's common, but it's worth looking at sleep quality and blood sugar stability. Are you eating breakfast within an hour of waking?`;

  return `That's a great question. Many answers to PCOS challenges come from understanding your own patterns. Keep logging your daily symptoms — the data you're building is genuinely valuable for self-understanding and for conversations with your healthcare provider.\n\nI can share evidence-based guidance on nutrition, movement, supplements, sleep, or hormones. What would you like to explore?`;
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

// ─── Screen ───────────────────────────────────────────────────────────────────
const WELCOME: Message = {
  id: "welcome",
  role: "nylaia",
  text: "Hello. I'm Nylaia — your PCOS companion. I'm here to help you understand your symptoms, navigate your condition, and feel less alone in this. What's on your mind today?",
};

export default function CompanionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkIns, getCyclePhase } = useApp();

  const phase = getCyclePhase();
  const latestCheckIn = checkIns[0] ?? null;

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatRef = useRef<FlatList<Message>>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function ensureConversation(token: string): Promise<string> {
    if (conversationId) return conversationId;
    const res = await fetch(`${API_URL}/api/anthropic/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: "Nylaia Chat" }),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    const data = await res.json();
    setConversationId(data.id);
    return data.id;
  }

  // ── Send via real AI backend (SSE streaming) ─────────────────────────────────
  async function sendWithAI(text: string) {
    const token = await getAuthToken();
    if (!token) {
      fallbackReply(text);
      return;
    }

    let convId: string;
    try {
      convId = await ensureConversation(token);
    } catch {
      fallbackReply(text);
      return;
    }

    // Add a streaming placeholder bubble
    const streamId = `stream-${Date.now()}`;
    setMessages(prev => [{ id: streamId, role: "nylaia", text: "", streaming: true }, ...prev]);

    try {
      const res = await fetch(`${API_URL}/api/anthropic/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok || !res.body) throw new Error("Bad response from API");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.error) throw new Error(payload.error);
            if (payload.done) break;
            if (payload.content) {
              fullText += payload.content;
              // Update the streaming bubble in place
              setMessages(prev =>
                prev.map(m => m.id === streamId ? { ...m, text: fullText } : m)
              );
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }

      // Mark streaming done
      setMessages(prev =>
        prev.map(m => m.id === streamId ? { ...m, streaming: false } : m)
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      // Replace placeholder with error message
      setMessages(prev =>
        prev.map(m =>
          m.id === streamId
            ? { ...m, text: "Sorry, I couldn't connect right now. Please check your connection and try again.", streaming: false }
            : m
        )
      );
    }

    setIsTyping(false);
  }

  // ── Static fallback ──────────────────────────────────────────────────────────
  function fallbackReply(text: string) {
    setTimeout(() => {
      const reply = getStaticResponse(text, phase, latestCheckIn);
      setMessages(prev => [{ id: `${Date.now()}`, role: "nylaia", text: reply }, ...prev]);
      setIsTyping(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 800);
  }

  // ── Main send handler ────────────────────────────────────────────────────────
  function sendMessage() {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages(prev => [userMsg, ...prev]);
    setIsTyping(true);

    if (HAS_AI_BACKEND) {
      sendWithAI(text);
    } else {
      fallbackReply(text);
    }
  }

  function resetChat() {
    setMessages([WELCOME]);
    setConversationId(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
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
          <Text style={[
            styles.bubbleText,
            { color: isNylaia ? colors.foreground : colors.primaryForeground, fontFamily: "Inter_400Regular" },
          ]}>
            {item.streaming && item.text === "" ? "▍" : item.text}
            {item.streaming && item.text !== "" ? "▍" : ""}
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
              <View style={[styles.statusDot, { backgroundColor: HAS_AI_BACKEND ? "#7ABD98" : colors.mutedForeground }]} />
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                {HAS_AI_BACKEND ? "AI companion · online" : "Your PCOS companion"}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={resetChat} style={styles.newChatBtn}>
          <Feather name="edit" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        <Feather name="zap" size={12} color={colors.primary} />
        <Text style={[styles.bannerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {HAS_AI_BACKEND
            ? "Powered by Claude AI — evidence-based PCOS guidance"
            : "Evidence-based guidance — AI companion coming soon"}
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
          ListFooterComponent={isTyping && !messages.some(m => m.streaming) ? (
            <View style={[styles.messageRow, styles.rowNylaia]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>N</Text>
              </View>
              <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[styles.bubbleText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>▍</Text>
              </View>
            </View>
          ) : null}
        />

        <View style={[
          styles.inputRow,
          { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === "web" ? 34 : 16) },
        ]}>
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
