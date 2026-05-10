import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function onSignUp() {
    if (!name.trim() || !email.trim() || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", data.user.id);
    }

    setLoading(false);

    if (data.session) {
      // Email confirmation disabled — AuthGate handles redirect automatically
    } else {
      // Email confirmation required — show prompt
      setAwaitingConfirmation(true);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isDark ? ["#0A0A0A", "#1A1416"] : ["#FDF2F5", "#F8F9FA"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.bloom, { top: -100, right: -50, backgroundColor: colors.follicular + "20", width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6 }]} />
        <View style={[styles.bloom, { bottom: -150, left: -100, backgroundColor: colors.ovulation + "15", width: width, height: width, borderRadius: width * 0.5 }]} />
        <View style={[styles.bloom, { top: height * 0.4, left: -50, backgroundColor: colors.primary + "10", width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.hero}>
            <Text style={[styles.brand, { color: colors.follicular, fontFamily: "Inter_700Bold" }]}>NYLAIA</Text>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Start journey</Text>
            <View style={[styles.titleUnderline, { backgroundColor: colors.follicular }]} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(1000).springify()} style={styles.cardContainer}>
            <BlurView intensity={isDark ? 40 : 60} style={[styles.glassCard, { borderColor: colors.border + "40" }]}>
              <View style={[styles.cardContent, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)" }]}>

                {awaitingConfirmation ? (
                  <View style={{ alignItems: "center", paddingVertical: 16, gap: 16 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="mail" size={24} color={colors.primary} />
                    </View>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" }}>
                      Check your email
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 }}>
                      We sent a confirmation link to{"\n"}
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
                      {"\n\n"}Click the link to activate your account, then come back and sign in.
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.replace("/(auth)/sign-in")}
                      style={{ marginTop: 8, width: "100%", height: 52, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 15 }}>Go to Sign In</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {error && (
                      <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
                        <Feather name="alert-circle" size={14} color={colors.destructive} />
                        <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>{error}</Text>
                      </View>
                    )}

                    <View style={styles.inputGroup}>
                      <View style={styles.inputItem}>
                        <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>YOUR NAME</Text>
                        <TextInput
                          value={name}
                          onChangeText={setName}
                          placeholder="First name"
                          placeholderTextColor={colors.mutedForeground + "60"}
                          autoCapitalize="words"
                          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        />
                      </View>

                      <View style={[styles.separator, { backgroundColor: colors.border + "30" }]} />

                      <View style={styles.inputItem}>
                        <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>EMAIL ADDRESS</Text>
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="you@example.com"
                          placeholderTextColor={colors.mutedForeground + "60"}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                        />
                      </View>

                      <View style={[styles.separator, { backgroundColor: colors.border + "30" }]} />

                      <View style={styles.inputItem}>
                        <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>PASSWORD</Text>
                        <View style={styles.passRow}>
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Min. 6 characters"
                            placeholderTextColor={colors.mutedForeground + "60"}
                            secureTextEntry={!showPassword}
                            style={[styles.input, { flex: 1, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                          />
                          <Pressable onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                            <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={onSignUp}
                      disabled={loading || !name.trim() || !email.trim() || !password}
                      activeOpacity={0.8}
                      style={styles.actionBtnWrapper}
                    >
                      <LinearGradient
                        colors={[colors.follicular, colors.ovulation]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.actionBtn, { opacity: loading || !name.trim() || !email.trim() || !password ? 0.6 : 1 }]}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Text style={[styles.actionBtnText, { fontFamily: "Inter_700Bold" }]}>Get Started</Text>
                            <Feather name="arrow-right" size={18} color="#fff" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

              </View>
            </BlurView>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(800)} style={styles.footer}>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")} style={styles.footerBtn}>
              <Text style={[styles.footerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Already have an account?{" "}
                <Text style={[styles.footerLink, { color: colors.follicular, fontFamily: "Inter_600SemiBold" }]}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bloom: { position: "absolute", opacity: 0.6 },
  scroll: { paddingHorizontal: 32, alignItems: "center" },
  hero: { alignItems: "center", marginBottom: 40 },
  brand: { fontSize: 14, letterSpacing: 4, marginBottom: 12, opacity: 0.8 },
  title: { fontSize: 32, letterSpacing: -1.2, textAlign: "center" },
  titleUnderline: { width: 40, height: 3, borderRadius: 2, marginTop: 12, opacity: 0.3 },
  cardContainer: { width: width - 64, borderRadius: 32, overflow: "hidden", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  glassCard: { borderWidth: 1 },
  cardContent: { padding: 24 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 16, marginBottom: 20 },
  errorText: { flex: 1, fontSize: 12 },
  inputGroup: { marginBottom: 28 },
  inputItem: { paddingVertical: 8 },
  inputLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 6, opacity: 0.6 },
  input: { fontSize: 16, paddingVertical: 4 },
  separator: { height: 1, marginVertical: 8 },
  passRow: { flexDirection: "row", alignItems: "center" },
  eyeBtn: { padding: 4 },
  actionBtnWrapper: { width: "100%", height: 56, borderRadius: 20, overflow: "hidden" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  actionBtnText: { color: "#fff", fontSize: 16, letterSpacing: 0.5 },
  footer: { marginTop: 32 },
  footerBtn: { padding: 10 },
  footerText: { fontSize: 14 },
  footerLink: { textDecorationLine: "underline" },
});
