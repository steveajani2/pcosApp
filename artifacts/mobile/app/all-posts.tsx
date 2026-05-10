import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

type Post = {
  id: string;
  user: string;
  tag: string;
  title: string;
  text: string;
  likes: number;
  time: string;
  category: string;
  isLiked: boolean;
  isSaved: boolean;
};

function formatTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function LikeButton({ postId, count, initialLiked, userId }: { postId: string; count: number; initialLiked: boolean; userId: string | null }) {
  const [liked, setLiked] = useState(initialLiked);
  const [localCount, setLocalCount] = useState(count);
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPress = async () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalCount(c => wasLiked ? c - 1 : c + 1);
    scale.value = withSpring(1.3, { damping: 10 }, () => { scale.value = withSpring(1); });
    if (wasLiked) {
      await supabase.from("likes").delete().match({ user_id: userId, post_id: postId });
    } else {
      await supabase.from("likes").insert({ user_id: userId, post_id: postId });
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
      <Animated.View style={animatedStyle}>
        <Feather name="heart" size={16} color={liked ? "#FF4B6E" : colors.mutedForeground} />
      </Animated.View>
      <Text style={[styles.actionText, { color: liked ? "#FF4B6E" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
        {localCount}
      </Text>
    </TouchableOpacity>
  );
}

function SaveButton({ postId, initialSaved, userId }: { postId: string; initialSaved: boolean; userId: string | null }) {
  const [saved, setSaved] = useState(initialSaved);
  const colors = useColors();

  const onPress = async () => {
    if (!userId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const wasSaved = saved;
    setSaved(!wasSaved);
    if (wasSaved) {
      await supabase.from("saves").delete().match({ user_id: userId, post_id: postId });
    } else {
      await supabase.from("saves").insert({ user_id: userId, post_id: postId });
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={[styles.saveBtn, { backgroundColor: saved ? colors.primary + "20" : colors.muted }]}>
      <Feather name="bookmark" size={14} color={saved ? colors.primary : colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function SocialCard({ post, index, userId }: { post: Post; index: number; userId: string | null }) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInUp.delay(100 + index * 50).springify()}
      style={[styles.socialCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.tagBadge, { backgroundColor: colors.primary + "10" }]}>
            <Text style={[styles.tagText, { color: colors.primary, fontFamily: "Inter_800ExtraBold" }]}>{post.tag}</Text>
          </View>
          <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{post.time}</Text>
        </View>
        <Text style={[styles.postTitleText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{post.title}</Text>
        <Text style={[styles.postBodyText, { color: colors.foreground, opacity: 0.8, fontFamily: "Inter_400Regular" }]} numberOfLines={3}>{post.text}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.userInfo}>
            <View style={[styles.avatarSmall, { backgroundColor: colors.muted }]}>
              <Text style={{ fontSize: 9, color: colors.mutedForeground }}>{post.user[0]}</Text>
            </View>
            <Text style={[styles.userName, { color: colors.mutedForeground }]}>{post.user}</Text>
          </View>
          <View style={styles.footerActions}>
            <LikeButton postId={post.id} count={post.likes} initialLiked={post.isLiked} userId={userId} />
            <SaveButton postId={post.id} initialSaved={post.isSaved} userId={userId} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function AllPostsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("id, author_name, title, body, category, created_at, likes(count), saves(user_id)")
      .order("created_at", { ascending: false });

    if (data) {
      setPosts(
        data.map((p: any) => ({
          id: p.id,
          user: p.author_name,
          tag: (p.category ?? "POST").toUpperCase(),
          title: p.title || p.body.split("\n")[0].slice(0, 60),
          text: p.body,
          likes: Array.isArray(p.likes) ? (p.likes[0]?.count ?? 0) : 0,
          time: formatTime(p.created_at),
          category: p.category,
          isLiked: false,
          isSaved: Array.isArray(p.saves) && p.saves.some((s: any) => s.user_id === userId),
        }))
      );
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { fetchPosts(); }, [fetchPosts]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Community</Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/create-post"); }}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="edit-2" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : posts.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 15 }]}>
            No posts yet. Be the first!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {posts.map((post, i) => (
            <SocialCard key={post.id} post={post} index={i} userId={userId} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, letterSpacing: -0.5 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  socialCard: { borderRadius: 32, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  cardContent: { padding: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 8, letterSpacing: 1 },
  postTime: { fontSize: 11, opacity: 0.6 },
  postTitleText: { fontSize: 18, marginBottom: 8 },
  postBodyText: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSmall: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 12 },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 13 },
  saveBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
