import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import React, { useState, useMemo, useCallback } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInUp,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

const TRIBES = ["All", "Nutrition", "Fertility", "Hormones", "Skin", "Sleep", "Mindset"];
const PRODUCT_COLORS = ["#D4A5B2", "#7ABD98", "#9B7EC8", "#D4956A"];

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

type Product = {
  id: string;
  name: string;
  brand: string;
  price: string;
  color: string;
};

function formatTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{title}</Text>
        {subtitle && <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      {onSeeAll && (
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onSeeAll(); }}>
          <Text style={[styles.seeAllText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>SEE ALL</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function LikeButton({ postId, count, initialLiked, userId }: { postId: string; count: number; initialLiked: boolean; userId: string | null }) {
  const [liked, setLiked] = useState(initialLiked);
  const [localCount, setLocalCount] = useState(count);
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

function SocialCard({ post, userId }: { post: Post; userId: string | null }) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInUp.delay(200).springify()}
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

export default function SocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const [selectedTribe, setSelectedTribe] = useState("All");
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const fetchData = useCallback(async () => {
    const [postsRes, productsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, user_id, author_name, title, body, category, created_at, likes(count), saves(user_id)")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("products").select("id, name, brand, price").eq("active", true).limit(2),
    ]);

    if (postsRes.data) {
      setPosts(
        postsRes.data.map((p: any) => ({
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

    if (productsRes.data) {
      setProducts(
        productsRes.data.map((p: any, i: number) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
        }))
      );
    }

    setLoadingPosts(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const filteredPosts = useMemo(() => {
    if (selectedTribe === "All") return posts;
    return posts.filter(p => p.category === selectedTribe);
  }, [selectedTribe, posts]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 + 84 : 84 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Community</Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/create-post"); }}
            style={[styles.actionIconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="plus" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.tribeNav}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tribeNavScroll}>
            {TRIBES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => { Haptics.selectionAsync(); setSelectedTribe(t); }}
                style={[styles.tribeChip, { backgroundColor: selectedTribe === t ? colors.primary : colors.muted }]}
              >
                <Text style={[styles.tribeChipText, { color: selectedTribe === t ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {products.length > 0 && (
          <View style={styles.boutiqueSection}>
            <SectionHeader title="The Wellness Shop" subtitle="Community-vetted protocols" />
            <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.boutiqueHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={["#D4A5B220", "#9B7EC820"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.boutiqueHeroContent}>
                <Text style={[styles.boutiqueHeroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Essential Hormone Support</Text>
                <Text style={[styles.boutiqueHeroDesc, { color: colors.mutedForeground }]}>Community-vetted supplement stack for PCOS.</Text>
                <TouchableOpacity
                  onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.push("/shop"); }}
                  style={[styles.shopNowBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.shopNowText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>EXPLORE SHOP</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.productGrid}>
              {products.map((prod, i) => (
                <Animated.View entering={FadeInRight.delay(100 + i * 100).springify()} key={prod.id}>
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/shop"); }}
                    style={[styles.miniProduct, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.miniProdIcon, { backgroundColor: prod.color + "15" }]}>
                      <Feather name="shopping-bag" size={16} color={prod.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.miniProdBrand, { color: colors.mutedForeground }]}>{prod.brand}</Text>
                      <Text style={[styles.miniProdName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{prod.name}</Text>
                    </View>
                    <Text style={[styles.miniProdPrice, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{prod.price}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.mainFeed}>
          <SectionHeader
            title="Collective Wisdom"
            subtitle={`${filteredPosts.length} post${filteredPosts.length !== 1 ? "s" : ""} in ${selectedTribe}`}
            onSeeAll={() => router.push("/all-posts")}
          />
          {loadingPosts ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: 40 }} />
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map(post => <SocialCard key={post.id} post={post} userId={userId} />)
          ) : (
            <View style={[styles.emptyFeed, { backgroundColor: colors.muted }]}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
                {posts.length === 0 ? "Be the first to share your wisdom!" : "No posts in this tribe yet."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  pageTitle: { fontSize: 26, letterSpacing: -0.8 },
  actionIconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  tribeNav: { marginBottom: 32 },
  tribeNavScroll: { gap: 10 },
  tribeChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  tribeChipText: { fontSize: 13 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 },
  sectionTitle: { fontSize: 20, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 13, marginTop: 2, opacity: 0.8 },
  seeAllText: { fontSize: 11, letterSpacing: 1 },
  socialCard: { borderRadius: 32, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  cardContent: { padding: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: "hidden" },
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
  boutiqueSection: { marginBottom: 32 },
  boutiqueHero: { borderRadius: 32, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  boutiqueHeroContent: { padding: 24 },
  boutiqueHeroTitle: { fontSize: 18, marginBottom: 8 },
  boutiqueHeroDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20, opacity: 0.8 },
  shopNowBtn: { paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  shopNowText: { fontSize: 12, letterSpacing: 1 },
  productGrid: { gap: 12 },
  miniProduct: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 24, borderWidth: 1, gap: 14 },
  miniProdIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  miniProdBrand: { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  miniProdName: { fontSize: 14 },
  miniProdPrice: { fontSize: 14 },
  mainFeed: {},
  emptyFeed: { padding: 40, borderRadius: 24, alignItems: "center" },
});
