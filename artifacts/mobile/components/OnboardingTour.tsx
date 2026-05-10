import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export type TourStep = {
    title: string;
    desc: string;
    pointerTop: number;
};

export interface OnboardingTourProps {
    visible: boolean;
    onFinish: () => void;
    onStepChange?: (step: number) => void;
    steps: TourStep[];
}

export function OnboardingTour({ visible, onFinish, onStepChange, steps }: OnboardingTourProps) {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const [step, setStep] = React.useState(0);

    const animatedTop = useSharedValue(steps[0]?.pointerTop || 0);

    React.useEffect(() => {
        if (visible && steps[step]) {
            animatedTop.value = withSpring(steps[step].pointerTop, { damping: 15, stiffness: 100 });
        }
    }, [step, visible, steps]);

    // Reset step when it becomes invisible
    React.useEffect(() => {
        if (!visible) {
            setStep(0);
            animatedTop.value = steps[0]?.pointerTop || 0;
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        top: animatedTop.value,
    }));

    if (!visible || steps.length === 0) return null;

    const currentTour = steps[step];
    const advance = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (step < steps.length - 1) {
            const nextStep = step + 1;
            setStep(nextStep);
            onStepChange?.(nextStep);
        } else {
            onFinish();
        }
    };

    return (
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1999 }]} onPress={advance}>
            <TouchableOpacity 
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onFinish(); }} 
                style={{ position: 'absolute', top: insets.top + 16, right: 24, zIndex: 2002 }}
            >
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: "Inter_600SemiBold" }}>SKIP</Text>
            </TouchableOpacity>

            <View style={{ position: 'absolute', top: insets.top + 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, zIndex: 2002 }}>
                {steps.map((_, i) => (
                    <View key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? '#FFFFFF' : 'rgba(255,255,255,0.25)' }} />
                ))}
            </View>

            <Animated.View 
                entering={FadeInUp.springify()} 
                style={[{ position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 2001 }, animatedStyle]}
            >
                <MaterialCommunityIcons name="gesture-tap" size={42} color="#FFFFFF" />
                
                <View style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, width: 240, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: "Inter_700Bold", textAlign: 'center', letterSpacing: -0.3 }}>{currentTour.title}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: "Inter_400Regular", textAlign: 'center', marginTop: 4, lineHeight: 16 }}>{currentTour.desc}</Text>
                    
                    <TouchableOpacity 
                        onPress={advance}
                        style={{ marginTop: 16, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16 }}
                    >
                        <Text style={{ color: '#000000', fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 }}>
                            {step < steps.length - 1 ? "NEXT" : "GOT IT"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Pressable>
    );
}
