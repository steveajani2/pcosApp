import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

const TRIBES = ["Nutrition", "Fertility", "Hormones", "Skin", "Sleep", "Mindset"];

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId, settings } = useApp();
  const params = useLocalSearchParams<{ initialText?: string; initialTribe?: string }>();
  
  const [text, setText] = useState(params.initialText || "");
  const [selectedTribe, setSelectedTribe] = useState(params.initialTribe || "Nutrition");
  const [isPosting, setIsPosting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  const addPollOption = () => {
    if (pollOptions.length < 5) {
        setPollOptions([...pollOptions, ""]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updatePollOption = (text: string, index: number) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
        const newOptions = pollOptions.filter((_, i) => i !== index);
        setPollOptions(newOptions);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const onPost = async () => {
    if (text.length < 5 || isPosting || !userId) return;
    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      author_name: settings.name || "Anonymous",
      title: text.split("\n")[0].slice(0, 80) || "New Post",
      body: text,
      category: selectedTribe,
      image_url: photoUri ?? null,
    });
    setIsPosting(false);
    if (error) {
      Alert.alert("Post failed", error.message);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.background }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>New Wisdom</Text>
        <TouchableOpacity 
          onPress={onPost}
          disabled={text.length < 5 || isPosting}
          style={[styles.postBtn, { backgroundColor: text.length >= 5 ? colors.primary : colors.muted, opacity: isPosting ? 0.6 : 1 }]}
        >
          <Text style={[styles.postBtnText, { color: text.length >= 5 ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
            {isPosting ? "POSTING..." : "SHARE"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <Animated.View entering={FadeInUp.delay(100).springify()}>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>SELECT A TRIBE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tribeScroll}>
                {TRIBES.map((t) => (
                    <TouchableOpacity 
                      key={t} 
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedTribe(t);
                      }}
                      style={[styles.tribeChip, { backgroundColor: selectedTribe === t ? colors.primary : colors.muted }]}
                    >
                        <Text style={[styles.tribeChipText, { color: selectedTribe === t ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.inputWrapper}>
            <TextInput
              multiline
              autoFocus
              placeholder="What wisdom would you like to share with the sanctuary today?"
              placeholderTextColor={colors.mutedForeground + "80"}
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              value={text}
              onChangeText={setText}
            />
            {photoUri && (
                <View style={[styles.photoPreview, { backgroundColor: colors.muted }]}>
                    <Image source={{ uri: photoUri }} style={styles.fullImg} borderRadius={24} />
                    <TouchableOpacity 
                      style={styles.removePhoto}
                      onPress={() => setPhotoUri(null)}
                    >
                        <Feather name="x" size={12} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {showPoll && (
                <Animated.View entering={FadeIn.duration(300)} style={[styles.pollContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.pollHeader}>
                        <Text style={[styles.pollTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Create a Poll</Text>
                        <TouchableOpacity onPress={() => setShowPoll(false)}>
                            <Feather name="trash-2" size={16} color={colors.destructive} />
                        </TouchableOpacity>
                    </View>
                    {pollOptions.map((opt, idx) => (
                        <View key={idx} style={styles.pollInputWrapper}>
                            <TextInput 
                                placeholder={`Option ${idx + 1}`}
                                placeholderTextColor={colors.mutedForeground}
                                value={opt}
                                onChangeText={(val) => updatePollOption(val, idx)}
                                style={[styles.pollInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                            />
                            {pollOptions.length > 2 && (
                                <TouchableOpacity onPress={() => removePollOption(idx)} style={styles.removeOption}>
                                    <Feather name="minus-circle" size={18} color={colors.mutedForeground} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    {pollOptions.length < 5 && (
                        <TouchableOpacity onPress={addPollOption} style={styles.addOptionBtn}>
                            <Feather name="plus" size={16} color={colors.primary} />
                            <Text style={[styles.addOptionText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Add Option</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={styles.attachmentBtn}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
                setPhotoUri(result.assets[0].uri);
            }
          }}
        >
            <Feather name="image" size={20} color={colors.primary} />
            <Text style={[styles.attachmentText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Add Photo</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.attachmentBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert("Coming Soon", "Polls will be available in a future update.");
          }}
        >
            <Feather name="bar-chart-2" size={20} color={colors.mutedForeground} />
            <Text style={[styles.attachmentText, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>Add Poll</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, letterSpacing: -0.5 },
  postBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  postBtnText: { fontSize: 12, letterSpacing: 1 },
  content: { padding: 24 },
  label: { fontSize: 11, letterSpacing: 1, marginBottom: 16 },
  tribeScroll: { gap: 8, marginBottom: 32 },
  tribeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  tribeChipText: { fontSize: 12 },
  inputWrapper: { minHeight: 200 },
  input: { fontSize: 18, lineHeight: 28, textAlignVertical: 'top' },
  photoPreview: { width: '100%', height: 200, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  fullImg: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pollContainer: { marginTop: 20, padding: 16, borderRadius: 20, borderWidth: 1, gap: 12 },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pollTitle: { fontSize: 13 },
  pollInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pollInput: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  removeOption: { padding: 4 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, alignSelf: 'flex-start' },
  addOptionText: { fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  attachmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachmentText: { fontSize: 13 },
  divider: { width: 1, height: 20, backgroundColor: '#eee' },
});
