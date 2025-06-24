import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { DynamicProvider } from "./src/lib/DynamicProvider";

export default function App() {
  return (
    <NavigationContainer>
      <DynamicProvider>
        <AppNavigator />
      </DynamicProvider>
    </NavigationContainer>
  );
}
