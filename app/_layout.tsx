import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";

export default function Layout() {
  useEffect(() => {
    // 開発時の警告を抑制
    LogBox.ignoreLogs([
      "Warning: Failed prop type",
      "Failed to register as background download task",
    ]);
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: "#000",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    />
  );
}
