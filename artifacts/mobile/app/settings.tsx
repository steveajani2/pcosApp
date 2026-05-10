import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const [name, setName] = useState(settings.name);
  const [email, setEmail] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  async function onSaveName() {
    if (!name.trim() || name.trim() === settings.name) return;
    setSavingName(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ name: name.trim() });
    setSavingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function onSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSignOutLoading(true);
          await supabase.auth.signOut();
          setSignOutLoading(false);
          // AuthGate in _layout.tsx handles redirect to sign-in
        },
      },
    ]);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Settings
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          PROFILE
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={onSaveName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground + "60"}
              style={[styles.rowInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              returnKeyType="done"
              onSubmitEditing={onSaveName}
            />
            {savingName && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Email</Text>
            <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{email || "—"}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          ACCOUNT
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={onSignOut}
            disabled={signOutLoading}
            style={styles.row}
          >
            {signOutLoading ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <>
                <Feather name="log-out" size={18} color={colors.destructive} />
                <Text style={[styles.signOutText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
                  Sign out
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 20, borderWidth: 1, marginBottom: 28, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { height: 1, marginHorizontal: 16 },
  rowLabel: { width: 60, fontSize: 14 },
  rowInput: { flex: 1, fontSize: 14 },
  rowValue: { flex: 1, fontSize: 14, textAlign: "right" },
  signOutText: { fontSize: 15, marginLeft: 4 },
});
