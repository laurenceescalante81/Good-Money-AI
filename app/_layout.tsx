import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { RewardsProvider } from "@/contexts/RewardsContext";
import { AppMessagesProvider } from "@/contexts/AppMessagesContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-transaction" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="setup-mortgage" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="setup-super" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="add-insurance" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="add-goal" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="connect-bank" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="bank-transactions" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="fact-find" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="switch-request" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <AccessibilityProvider>
              <FinanceProvider>
                <RewardsProvider>
                  <AppMessagesProvider>
                    <RootLayoutNav />
                  </AppMessagesProvider>
                </RewardsProvider>
              </FinanceProvider>
            </AccessibilityProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
