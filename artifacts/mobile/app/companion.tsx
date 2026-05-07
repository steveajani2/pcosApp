import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Message = {
  id: string;
  role: "elara" | "user";
  text: string;
  streaming?: boolean;
};

const WELCOME: Message = {
  id: "welcome",
  role: "elara",
  text: "Hello. I'm Elara — your PCOS companion. I'm here to help you understand your symptoms, navigate your condition, and feel less alone in this. What's on your mind today?",
};

async function getOrCreateConversation(): Promise<number> {
  const res = await fetch(`${BASE_URL}/api/anthropic/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Elara Chat" }),
  });
  const data = await res.json() as { id: number };
  return data.id;
}

export default function CompanionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkIns, getStreak, getCyclePhase } = useApp();

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const flatRef = useRef<FlatList<Message>>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    getOrCreateConversation().then(setConversationId).catch(() => {});
  }, []);

  const buildContextMessage = () => {
    const phase = getCyclePhase();
    const streak = getStreak();
    const recentCheckIn = checkIns[0];
    let ctx = "";
    if (recentCheckIn) {
      ctx += `[User context: last logged — energy ${recentCheckIn.energy}/5, mood ${recentCheckIn.mood}/5, stress ${recentCheckIn.stress}/5, bloating ${recentCheckIn.bloating}/5, cravings ${recentCheckIn.cravings}/5. Cycle phase: ${phase}. Logging streak: ${streak} days.]`;
    } else {
      ctx += `[User context: no check-ins logged yet. Cycle phase: ${phase}.]`;
    }
    return ctx;
  };

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming || !conversationId) return;

    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text,
    };
    setMessages((prev) => [userMsg, ...prev]);

    const streamId = (Date.now() + 1).toString();
    streamingIdRef.current = streamId;
    const elaraMsg: Message = { id: streamId, role: "elara", text: "", streaming: true };
    setMessages((prev) => [elaraMsg, ...prev]);
    setIsStreaming(true);

    const contextPrefix = messages.length <= 1 ? buildContextMessage() + " " : "";
    const fullContent = contextPrefix + text;

    try {
      const response = await fetch(
        `${BASE_URL}/api/anthropic/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: fullContent }),
        }
      );

      if (!response.body) throw new Error("No stream body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr) as { content?: string; done?: boolean; error?: string };
            if (data.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId ? { ...m, text: m.text + data.content } : m
                )
              );
            }
            if (data.done || data.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? { ...m, streaming: false, text: data.error ? "Sorry, something went wrong. Please try again." : m.text }
                    : m
                )
              );
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamId
            ? { ...m, streaming: false, text: "I'm having trouble connecting right now. Please try again in a moment." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      streamingIdRef.current = null;
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderItem = ({ item }: { item: Message }) => {
    const isElara = item.role === "elara";
    return (
      <View style={[styles.messageRow, isElara ? styles.messageRowElara : styles.messageRowUser]}>
        {isElara && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>E</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isElara
              ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
              : { backgroundColor: colors.primary },
          ]}
        >
          <Text style={[styles.bubbleText, { color: isElara ? colors.foreground : colors.primaryForeground, fontFamily: "Inter_400Regular" }]}>
            {item.text || (item.streaming ? "" : "")}
          </Text>
          {item.streaming && item.text === "" && (
            <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Thinking...</Text>
          )}
          {item.streaming && item.text !== "" && (
            <View style={[styles.cursor, { backgroundColor: colors.primary }]} />
          )}
        </View>
      </View>
    );
  };

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
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Your PCOS companion</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={async () => {
            if (!conversationId) return;
            const newId = await getOrCreateConversation();
            setConversationId(newId);
            setMessages([WELCOME]);
          }}
          style={styles.newChatBtn}
        >
          <Feather name="edit" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
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
            editable={!isStreaming}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!input.trim() || isStreaming || !conversationId}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isStreaming ? colors.primary : colors.muted,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather
              name={isStreaming ? "loader" : "send"}
              size={18}
              color={input.trim() && !isStreaming ? colors.primaryForeground : colors.mutedForeground}
            />
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
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  headerSub: { fontSize: 12 },
  newChatBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  messageRowElara: { justifyContent: "flex-start" },
  messageRowUser: { justifyContent: "flex-end" },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 13 },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 14, flexDirection: "row", flexWrap: "wrap" },
  bubbleText: { fontSize: 15, lineHeight: 22, flex: 1 },
  typingText: { fontSize: 14 },
  cursor: { width: 2, height: 16, marginLeft: 2, alignSelf: "flex-end", marginBottom: 2, opacity: 0.7 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
