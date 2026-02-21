import { useEffect } from "react";
import { router } from "expo-router";

export default function FactFindModal() {
  useEffect(() => {
    router.replace("/(tabs)/fact-find" as any);
  }, []);
  return null;
}
