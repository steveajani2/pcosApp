import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { supabase, Session } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

// Module-level setter — sign-in screen calls activateDevBypass() to flip this live
let _setDevBypass: ((v: boolean) => void) | null = null;
export async function activateDevBypass() {
  await AsyncStorage.setItem("@nylaia/dev_bypass", "1");
  _setDevBypass?.(true);
}

const queryClient = new QueryClient();

function AuthGate({ session, devBypass }: { session: Session | null | undefined; devBypass: boolean }) {
  const segments = useSegments();
  const router = useRouter();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Fetch (or re-fetch) onboarded status whenever the user or top-level route changes.
  // Resetting to null first ensures the redirect effect waits for fresh data.
  useEffect(() => {
    if (__DEV__ && devBypass) return;
    if (!session) {
      setOnboarded(null);
      return;
    }
    setOnboarded(null);
    supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setOnboarded(data?.onboarded ?? false));
  }, [session?.user.id, segments[0], devBypass]);

  useEffect(() => {
    if (__DEV__ && devBypass) return;
    if (session === undefined) return;

    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!session) {
      if (!inAuth) router.replace("/(auth)/sign-in");
      return;
    }

    if (onboarded === null) return; // waiting for profile fetch

    if (!onboarded) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }

    if (inAuth || inOnboarding) router.replace("/(tabs)");
  }, [session, onboarded, segments, devBypass]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="checkin"
        options={{ presentation: "modal", headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="companion"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="report"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="shop"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="create-post"
        options={{ presentation: "modal", headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="cart"
        options={{ presentation: "modal", headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="all-posts"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // undefined = still checking, false = no bypass, true = bypass active
  const [devBypass, setDevBypass] = useState<boolean | undefined>(__DEV__ ? undefined : false);

  useEffect(() => {
    _setDevBypass = setDevBypass;
    if (__DEV__) {
      AsyncStorage.getItem("@nylaia/dev_bypass").then(v => setDevBypass(!!v));
    }
    return () => { _setDevBypass = null; };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fontsReady = fontsLoaded || fontError;
    const bypassReady = devBypass !== undefined;
    const sessionReady = devBypass === true || session !== undefined;
    if (fontsReady && bypassReady && sessionReady) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, devBypass, session]);

  if (!fontsLoaded && !fontError) return null;
  if (devBypass === undefined) return null; // waiting for AsyncStorage check
  if (devBypass !== true && session === undefined) return null; // waiting for session

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <AuthGate session={session} devBypass={devBypass ?? false} />
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
