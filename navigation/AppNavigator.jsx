import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";

import SplashScreen from "../screens/SplashScreen";
import SearchScreen from "../screens/SearchScreen";
import BusListScreen from "../screens/BusListScreen";
import ScheduleScreen from "../screens/ScheduleScreen";
import TimetableScreen from "../screens/TimetableScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,

        // ✅ Smooth transition for ALL pages
        animation: "slide_from_right",
        animationDuration: 200,

        contentStyle: {
          backgroundColor: theme?.background || "#fff",
        },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ animation: "fade" }}
      />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="BusList" component={BusListScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Timetable" component={TimetableScreen} />
    </Stack.Navigator>
  );
}
