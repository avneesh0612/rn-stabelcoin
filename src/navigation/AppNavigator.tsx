import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { client } from "../client";
import "react-native-get-random-values";
import { Linking, Alert, View, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import CustomTabBar from "../CustomTabBar";
import SplashScreen from "../screens/SplashScreen";

import HomeScreen from "../screens/HomeScreen";
import SendScreen from "../screens/SendScreen";
import RequestScreen from "../screens/RequestScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useReactiveClient } from "@dynamic-labs/react-hooks";
import { supabase } from "../lib/supabase";
import { LoginView, RootStackParamList } from "../LoginView/LoginView";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Deep linking configuration
const linking = {
  prefixes: ["reactnativeexpo://", "https://yourdomain.com"],
  config: {
    screens: {
      MainApp: {
        screens: {
          Send: {
            path: "send/:paymentLinkId",
            parse: {
              paymentLinkId: (id: string) => id,
            },
          },
        },
      },
    },
  },
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Send"
        component={SendScreen}
        options={{
          tabBarLabel: "Send",
        }}
      />
      <Tab.Screen
        name="Request"
        component={RequestScreen}
        options={{
          tabBarLabel: "Request",
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { wallets, sdk } = useReactiveClient(client);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const handleAuthSuccess = async (user: any) => {
      console.log("handleAuthSuccess", user);
      try {
        const { email, verifiedCredentials, firstName } = user;
        if (
          !email ||
          !verifiedCredentials?.[0]?.id ||
          !verifiedCredentials?.[0]?.address
        ) {
          console.error("Missing required user fields for insert");
          return;
        }
        // Insert new user
        const { error } = await supabase.from("users").insert({
          email,
          wallet_address: verifiedCredentials[0].address,
          full_name: firstName ?? "",
        });
        if (error && error.code !== "23505") {
          // Ignore duplicate error
          console.error("Failed to insert user:", error);
        }
      } catch (err) {
        console.error("Error in handleAuthSuccess:", err);
      }
    };

    const handleUserProfileUpdated = async (user: any) => {
      console.log("handleUserProfileUpdated", user);
      try {
        const { email, verifiedCredentials, firstName } = user;
        if (
          !email ||
          !verifiedCredentials?.[0]?.id ||
          !verifiedCredentials?.[0]?.address
        ) {
          console.error("Missing required user fields for upsert");
          return;
        }
        // Upsert user
        const { error } = await supabase
          .from("users")
          .update({
            wallet_address: verifiedCredentials[0].address,
            full_name: firstName ?? "",
          })
          .eq("email", email);
        if (error) {
          console.error("Failed to upsert user:", error);
        }
      } catch (err) {
        console.error("Error in handleUserProfileUpdated:", err);
      }
    };

    // Listen for authSuccess and userProfileUpdated events
    client.auth.on("authSuccess", handleAuthSuccess);
    client.auth.on("userProfileUpdated", handleUserProfileUpdated);

    // Clean up the listeners on unmount
    return () => {
      client.auth.off("authSuccess", handleAuthSuccess);
      client.auth.off("userProfileUpdated", handleUserProfileUpdated);
    };
  }, []);

  useEffect(() => {
    // Handle deep links
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes("/send/")) {
        const paymentLinkId = url.split("/send/")[1];
        try {
          const { data: paymentLink, error } = await supabase
            .from("payment_links")
            .select("*")
            .eq("id", paymentLinkId)
            .single();

          if (error) throw error;
          if (!paymentLink) throw new Error("Payment link not found");

          // Navigate to MainApp and then to Send screen with payment link data
          navigation.navigate("MainApp", {
            screen: "Send",
            params: {
              recipient: paymentLink.from,
              amount: paymentLink.amount,
              note: paymentLink.note,
              paymentLinkId: paymentLink.id,
            },
          });
        } catch (error) {
          console.error("Error handling payment link:", error);
          Alert.alert("Error", "Invalid or expired payment link");
        }
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f8fa" }}>
      {!sdk.loaded ? (
        <SplashScreen />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!wallets.primary ? (
            <Stack.Screen name="Login" component={LoginView} />
          ) : (
            <Stack.Screen name="MainApp" component={TabNavigator} />
          )}
        </Stack.Navigator>
      )}
    </SafeAreaView>
  );
};

export default AppNavigator;
