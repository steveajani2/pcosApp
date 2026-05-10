import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  withDelay,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";

interface Props {
    label?: string;
}

export function AssistantButton({ label = "Ask Nylaia" }: Props) {
  const colors = useColors();
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const expand = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 3000 }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1.1, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1, true);
    
    expand.value = withRepeat(
      withSequence(
        withDelay(2000, withTiming(1, { duration: 800 })), 
        withDelay(3500, withTiming(0, { duration: 800 })), 
        withDelay(5000, withTiming(0, { duration: 100 }))  
      ),
      -1,
      false
    );
  }, []);

  const animatedGlow = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.1], [0.6, 1]),
    width: interpolate(expand.value, [0, 1], [90, 160]),
    height: interpolate(expand.value, [0, 1], [90, 160]),
  }));

  const animatedContainer = useAnimatedStyle(() => ({
    width: interpolate(expand.value, [0, 1], [46, 130]),
    shadowColor: colors.primary,
    shadowOpacity: interpolate(pulse.value, [1, 1.1], [0.2, 0.5]),
    shadowRadius: interpolate(pulse.value, [1, 1.1], [10, 20]),
    transform: [{ scale: iconScale.value }],
  }));

  const textContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.value, [0.5, 1], [0, 1]),
    width: interpolate(expand.value, [0, 1], [0, 75]),
    marginLeft: interpolate(expand.value, [0, 1], [0, 8]),
  }));

  return (
    <Pressable
      onPressIn={() => (iconScale.value = withTiming(0.9))}
      onPressOut={() => (iconScale.value = withTiming(1))}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/companion"); }}
    >
      <Animated.View style={[styles.morphBox, animatedContainer]}>
        {/* Glow behind the button */}
        <Animated.View style={[styles.glowLayer, animatedGlow]}>
          <LinearGradient
            colors={['#D4A5B2', '#9B7EC8', '#7ABD98', '#D4A5B2']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* The morphing content box */}
        <View style={styles.morphContentWrapper}>
            <View style={[styles.morphContent, { backgroundColor: colors.background }]}>
                <View style={styles.iconCenterer}>
                    <Feather name="command" size={18} color={colors.foreground} />
                </View>
                
                <Animated.View style={[textContainerStyle, { overflow: 'hidden' }]}>
                    <Text numberOfLines={1} style={[styles.morphText, { color: colors.foreground, fontFamily: "Inter_600SemiBold", width: 75 }]}>
                        {label}
                    </Text>
                </Animated.View>
            </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  morphBox: { height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", overflow: 'hidden' },
  glowLayer: { position: 'absolute', borderRadius: 80 },
  morphContentWrapper: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  morphContent: { width: '100%', height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  iconCenterer: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  morphText: { fontSize: 12, letterSpacing: -0.2 },
});
