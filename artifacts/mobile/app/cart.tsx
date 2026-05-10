import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, FadeInRight } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cartItems, clearCart } = useApp();

  const total = cartItems.reduce((acc, item) => {
    const priceNum = parseFloat(item.price.replace("$", ""));
    return acc + (priceNum * item.quantity);
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 10 }}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your Bag</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {cartItems.length === 0 ? (
            <Animated.View entering={FadeInUp.delay(100).springify()} style={[styles.emptyState, { backgroundColor: colors.muted }]}>
                <Feather name="shopping-bag" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Your bag is empty</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Looks like you haven't added any clinical-grade protocols to your bag yet.</Text>
                
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                  }}
                  style={[styles.shopBtn, { backgroundColor: colors.primary }]}
                >
                    <Text style={[styles.shopBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>CONTINUE SHOPPING</Text>
                </TouchableOpacity>
            </Animated.View>
        ) : (
            <View style={{ width: '100%' }}>
                {cartItems.map((item, i) => (
                    <Animated.View entering={FadeInRight.delay(i * 100).springify()} key={item.id} style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.itemImgPlaceholder, { backgroundColor: colors.muted }]}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.fullImg} />
                            ) : (
                                <Feather name="package" size={20} color={colors.mutedForeground} />
                            )}
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={[styles.itemName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.name}</Text>
                            <View style={styles.itemMeta}>
                                <Text style={[styles.itemPrice, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{item.price}</Text>
                                <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>Qty: {item.quantity}</Text>
                            </View>
                        </View>
                    </Animated.View>
                ))}
            </View>
        )}
      </ScrollView>

      {cartItems.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.checkoutFooter, { borderTopColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Estimated Total</Text>
                  <Text style={[styles.totalAmount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>${total.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert("Coming Soon", "Secure checkout is coming soon. Your cart has been saved.");
                }}
                style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
              >
                  <Text style={[styles.checkoutBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>SECURE CHECKOUT</Text>
              </TouchableOpacity>
          </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, letterSpacing: -0.5 },
  content: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
  emptyState: { width: '100%', padding: 40, borderRadius: 32, alignItems: 'center', gap: 16, marginTop: 40 },
  emptyTitle: { fontSize: 20, marginTop: 10 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.8 },
  shopBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20 },
  shopBtnText: { fontSize: 12, letterSpacing: 1 },
  cartItem: { width: '100%', flexDirection: 'row', padding: 12, borderRadius: 20, borderWidth: 1, marginBottom: 12, alignItems: 'center', gap: 16 },
  itemImgPlaceholder: { width: 60, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fullImg: { width: '100%', height: '100%' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, marginBottom: 4 },
  itemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 15 },
  itemQty: { fontSize: 12 },
  checkoutFooter: { paddingHorizontal: 24, paddingTop: 20, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { fontSize: 14 },
  totalAmount: { fontSize: 24, letterSpacing: -0.5 },
  checkoutBtn: { width: '100%', paddingVertical: 16, borderRadius: 100, alignItems: 'center' },
  checkoutBtnText: { fontSize: 13, letterSpacing: 1 },
});
