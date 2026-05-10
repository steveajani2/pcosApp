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
import { activateDevBypass } from "../_layout";

const { width } = Dimensions.get("window");

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    // On success, AuthGate in _layout.tsx handles the redirect automatically
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isDark ? ["#0A0A0A", "#1A1416"] : ["#FDF2F5", "#F8F9FA"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.bloom, { top: -100, left: -50, backgroundColor: colors.tint + "20", width: width * 1.2, height: width * 1.2, borderRadius: width * 0.6 }]} />
        <View style={[styles.bloom, { bottom: -150, right: -100, backgroundColor: colors.luteal + "15", width: width, height: width, borderRadius: width * 0.5 }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.hero}>
            <Text style={[styles.brand, { color: colors.tint, fontFamily: "Inter_700Bold" }]}>NYLAIA</Text>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Welcome back</Text>
            <View style={[styles.titleUnderline, { backgroundColor: colors.tint }]} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(1000).springify()} style={styles.cardContainer}>
            <BlurView intensity={isDark ? 40 : 60} style={[styles.glassCard, { borderColor: colors.border + "40" }]}>
              <View style={[styles.cardContent, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.4)" }]}>

                {error && (
                  <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
                    <Feather name="alert-circle" size={14} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>{error}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <View style={styles.inputItem}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>EMAIL</Text>
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
                    <View style={styles.labelRow}>
                      <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>PASSWORD</Text>
                      <TouchableOpacity>
                        <Text style={[styles.forgotText, { color: colors.tint, fontFamily: "Inter_500Medium" }]}>Forgot?</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.passRow}>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
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
                  onPress={onSignIn}
                  disabled={loading || !email.trim() || !password}
                  activeOpacity={0.8}
                  style={styles.signInBtnWrapper}
                >
                  <LinearGradient
                    colors={[colors.tint, colors.luteal]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.signInBtn, { opacity: loading || !email.trim() || !password ? 0.6 : 1 }]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={[styles.signInBtnText, { fontFamily: "Inter_700Bold" }]}>Sign In</Text>
                        <Feather name="arrow-right" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(800)} style={styles.footer}>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} style={styles.footerBtn}>
              <Text style={[styles.footerText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                New to Nylaia?{" "}
                <Text style={[styles.footerLink, { color: colors.tint, fontFamily: "Inter_600SemiBold" }]}>Create an account</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {__DEV__ && (
            <Animated.View entering={FadeInUp.delay(600).duration(600)} style={{ marginTop: 16 }}>
              <TouchableOpacity
                onPress={async () => {
                  await activateDevBypass();
                  router.replace("/(tabs)");
                }}
                style={[styles.devBtn, { borderColor: colors.mutedForeground + "40" }]}
              >
                <Feather name="zap" size={14} color={colors.mutedForeground} />
                <Text style={[styles.devBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  Continue without account (Dev only)
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bloom: { position: "absolute", opacity: 0.6 },
  scroll: { paddingHorizontal: 32, alignItems: "center" },
  hero: { alignItems: "center", marginBottom: 48 },
  brand: { fontSize: 14, letterSpacing: 4, marginBottom: 12, opacity: 0.8 },
  title: { fontSize: 32, letterSpacing: -1.2, textAlign: "center" },
  titleUnderline: { width: 40, height: 3, borderRadius: 2, marginTop: 12, opacity: 0.3 },
  cardContainer: { width: width - 64, borderRadius: 32, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  glassCard: { borderWidth: 1 },
  cardContent: { padding: 24 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 16, marginBottom: 20 },
  errorText: { flex: 1, fontSize: 12 },
  inputGroup: { marginBottom: 28 },
  inputItem: { paddingVertical: 10 },
  inputLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 8, opacity: 0.6 },
  input: { fontSize: 16, paddingVertical: 4 },
  separator: { height: 1, marginVertical: 10 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  forgotText: { fontSize: 11 },
  passRow: { flexDirection: "row", alignItems: "center" },
  eyeBtn: { padding: 4 },
  signInBtnWrapper: { width: "100%", height: 56, borderRadius: 20, overflow: "hidden" },
  signInBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  signInBtnText: { color: "#fff", fontSize: 16, letterSpacing: 0.5 },
  footer: { marginTop: 32 },
  footerBtn: { padding: 10 },
  footerText: { fontSize: 14 },
  footerLink: { textDecorationLine: "underline" },
  devBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderStyle: "dashed" },
  devBtnText: { fontSize: 13 },
});
