// screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";



export default function SplashScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const moveAnim = useRef(new Animated.Value(-200)).current;
  const bumpAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(moveAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(bumpAnim, {
        toValue: 0,
        friction: 2,
        tension: 160,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace("Search");
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/logo.png")}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateX: moveAnim }],
          },
        ]}
      />

      <Animated.Text
        style={[
          styles.title,
          { opacity: fadeAnim, transform: [{ translateY: bumpAnim }] },
        ]}
      >
        YELLOH BUS
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
        Your smart bus companion
      </Animated.Text>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.secondary,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: 220,
      height: 230,
      marginBottom: 20,
      resizeMode: "contain",
    },
    title: {
      fontSize: 30,
      fontWeight: "bold",
      color: theme.GOLD_START,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textLight,
      fontStyle: "italic",
    },
  });