import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, FadeInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

const CATEGORIES = ["All", "Supplements", "Skincare", "Rituals", "Books"];

type Product = {
  id: string;
  name: string;
  brand: string;
  price: string;
  rating: number;
  image_url: string | null;
  category: string;
};

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cartItems, addToCart } = useApp();
  const [selectedCat, setSelectedCat] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
        setLoading(false);
      });
  }, []);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const onAddToCart = (prod: Product) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart({
      productId: prod.id,
      name: prod.name,
      price: prod.price,
      image: prod.image_url ?? undefined,
    });
  };

  const filtered = products.filter(p => selectedCat === "All" || p.category === selectedCat);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>The Wellness Shop</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/cart");
          }}
          style={[styles.cartBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="shopping-bag" size={20} color={colors.foreground} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
                <Text style={{ color: 'white', fontSize: 8, fontFamily: 'Inter_700Bold' }}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.catNav}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCat(c);
                      }}
                      style={[styles.catChip, { borderBottomColor: selectedCat === c ? colors.primary : "transparent" }]}
                    >
                        <Text style={[styles.catChipText, { color: selectedCat === c ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{c.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.heroSection}>
            <View style={[styles.heroCard, { borderColor: colors.border }]}>
                <LinearGradient
                  colors={["#B97A8D", "#9B7EC8", "#7ABD98"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroOverlay}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>NYLAIA ESSENTIALS</Text>
                    </View>
                    <Text style={styles.heroTitle}>The Morning Protocol Stack</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedCat("Rituals");
                      }}
                      style={styles.shopHeroBtn}
                    >
                        <Text style={styles.shopHeroBtnText}>VIEW ALL</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
              {filtered.map((prod, i) => (
                  <Animated.View
                    entering={FadeInUp.delay(200 + i * 100).springify()}
                    key={prod.id}
                    style={styles.productWrapper}
                  >
                      <TouchableOpacity
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                        style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                          <View style={[styles.productImgPlaceholder, { backgroundColor: colors.muted }]}>
                              {prod.image_url ? (
                                  <Image source={{ uri: prod.image_url }} style={styles.fullImg} />
                              ) : (
                                  <Feather name="package" size={32} color={colors.mutedForeground} />
                              )}
                          </View>
                          <View style={styles.productInfo}>
                              <Text style={[styles.brandText, { color: colors.mutedForeground }]}>{prod.brand}</Text>
                              <Text style={[styles.nameText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{prod.name}</Text>
                              <View style={styles.priceRow}>
                                  <Text style={[styles.priceText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{prod.price}</Text>
                                  <View style={styles.ratingRow}>
                                      <Feather name="star" size={10} color="#FFB800" />
                                      <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>{prod.rating}</Text>
                                  </View>
                              </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => onAddToCart(prod)}
                            style={[styles.addBtn, { backgroundColor: colors.primary }]}
                          >
                              <Feather name="plus" size={18} color={colors.primaryForeground} />
                          </TouchableOpacity>
                      </TouchableOpacity>
                  </Animated.View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, letterSpacing: -0.5 },
  cartBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  catNav: { marginBottom: 20 },
  catScroll: { paddingHorizontal: 20, gap: 24 },
  catChip: { paddingVertical: 12, borderBottomWidth: 2 },
  catChipText: { fontSize: 11, letterSpacing: 1 },
  heroSection: { paddingHorizontal: 20, marginBottom: 32 },
  heroCard: { width: '100%', height: 280, borderRadius: 32, borderWidth: 1, overflow: 'hidden' },
  heroOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: 24, justifyContent: 'flex-end' },
  tag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
  tagText: { color: 'white', fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  heroTitle: { color: 'white', fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 20, maxWidth: '80%' },
  shopHeroBtn: { alignSelf: 'flex-start', backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  shopHeroBtnText: { color: 'black', fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  grid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productWrapper: { width: '48%', marginBottom: 16 },
  productCard: { width: '100%', borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  productImgPlaceholder: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
  fullImg: { width: '100%', height: '100%' },
  productInfo: { padding: 12 },
  brandText: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  nameText: { fontSize: 14, marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: 15 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 10 },
  addBtn: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.2, shadowRadius: 5 },
});
