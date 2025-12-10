import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

import SplashScreen from "../screens/SplashScreen";
import SearchScreen from "../screens/SearchScreen";
import BusListScreen from "../screens/BusListScreen";
import ScheduleScreen from "../screens/ScheduleScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{ headerShown: false}}
        />
        <Stack.Screen
          name="BusList"
          component={BusListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
   
  );
}
