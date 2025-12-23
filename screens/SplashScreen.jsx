import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();

  // Animation values
  const yusOpacity = useRef(new Animated.Value(0)).current;
  const yusScale = useRef(new Animated.Value(0.5)).current;
  const yLetterPos = useRef(new Animated.Value(0)).current;
  const usLetterPos = useRef(new Animated.Value(0)).current;
  const busOpacity = useRef(new Animated.Value(0)).current;
  const busPosition = useRef(new Animated.Value(-width)).current;
  
  // Letters that appear between Y and US
  const letterE = useRef(new Animated.Value(0)).current;
  const letterL1 = useRef(new Animated.Value(0)).current;
  const letterL2 = useRef(new Animated.Value(0)).current;
  const letterO = useRef(new Animated.Value(0)).current;
  const letterH = useRef(new Animated.Value(0)).current;
  const letterB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step 1: YUS intro animation (0-1s)
    Animated.parallel([
      Animated.timing(yusOpacity, { 
        toValue: 1, 
        duration: 1000, 
        useNativeDriver: true 
      }),
      Animated.timing(yusScale, { 
        toValue: 1, 
        duration: 1000, 
        useNativeDriver: true 
      }),
    ]).start();

    // Step 2: Split Y and US + Bus entry (1s-2.5s)
    setTimeout(() => {
      Animated.parallel([
        // Y moves left
        Animated.timing(yLetterPos, { 
          toValue: -115,
          duration: 1500, 
          useNativeDriver: true 
        }),
        // US moves right
        Animated.timing(usLetterPos, { 
          toValue: 118,
          duration: 1500, 
          useNativeDriver: true 
        }),
        // Bus enters
        Animated.timing(busOpacity, { 
          toValue: 1, 
          duration: 2200, 
          useNativeDriver: true 
        }),
        Animated.timing(busPosition, { 
          toValue: 0, 
          duration: 2000, 
          useNativeDriver: true 
        }),
      ]).start();
    }, 1000);

    // Step 3: Animate letters BETWEEN Y and US (starts at 2.5s)
    setTimeout(() => {
      const letterSequence = [
        { ref: letterE, delay: 500 },
        { ref: letterL1, delay: 700 },
        { ref: letterL2, delay: 900 },
        { ref: letterO, delay: 1100 },
        { ref: letterH, delay: 1300 },
        { ref: letterB, delay: 1500 },
      ];

      letterSequence.forEach(({ ref, delay }) => {
        setTimeout(() => {
          Animated.timing(ref, { 
            toValue: 1, 
            duration: 600, 
            useNativeDriver: true 
          }).start();
        }, delay);
      });
    }, 1500);

    // Step 4: Complete animation (8s)
    setTimeout(() => {
      navigation.replace("Search");
    }, 4000);
  }, []);

  const AnimatedLetter = ({ letter, animValue }) => (
    <Animated.Text
      style={[
        styles.letter,
        styles.blackLetter,
        {
          opacity: animValue,
          transform: [{
            scale: animValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1.2, 1],
            }),
          }],
        },
      ]}
    >
      {letter}
    </Animated.Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Text Section */}
        <View style={styles.textSection}>
          {/* Container for all letters with ABSOLUTE positioning */}
          <View style={styles.absoluteContainer}>
            <Animated.View 
              style={[
                styles.textRow, 
                { 
                  opacity: yusOpacity, 
                  transform: [{ scale: yusScale }] 
                }
              ]}
            >
              {/* 🔹 YUS WRAPPER (CENTERED) */}
                <View style={styles.yusWrapper}>
                  <Animated.Text
                    style={[
                      styles.letter,
                      styles.goldLetter,
                      { transform: [{ translateX: yLetterPos }] },
                    ]}
                  >
                    Y
                  </Animated.Text>

                  <Animated.Text
                    style={[
                      styles.letter,
                      styles.goldLetter,
                      { transform: [{ translateX: usLetterPos }] },
                    ]}
                  >
                    US
                  </Animated.Text>
                </View>

              {/* ELLOH B - ABSOLUTE CENTER */}
              <View style={styles.centerLettersContainer}>
                <AnimatedLetter letter="E" animValue={letterE} />
                <AnimatedLetter letter="L" animValue={letterL1} />
                <AnimatedLetter letter="L" animValue={letterL2} />
                <AnimatedLetter letter="O" animValue={letterO} />
                <AnimatedLetter letter="H" animValue={letterH} />
                <View style={styles.spacer} />
                <AnimatedLetter letter="B" animValue={letterB} />
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Bus Image */}
        <Animated.View 
          style={[
            styles.busContainer, 
            { 
              opacity: busOpacity, 
              transform: [{ translateX: busPosition }] 
            }
          ]}
        >
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.busImage} 
            resizeMode="contain" 
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  textSection: {
    height: height * 0.15,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  absoluteContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  textRow: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteLetter: {
    position: 'absolute',
  },
  centerLettersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: '55%',
    transform: [{ translateX: -width * 0.4 }],
  },
  letter: {
    fontSize: width * 0.14,
    fontWeight: '400',
    fontFamily: 'BlackOpsOne-Regular', // Changed to native font name
    letterSpacing: 0.5,
  },
  spacer: {
    width: 10,
  },
  goldLetter: {
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 4,
  },
  blackLetter: {
    color: '#000000',
  },
  busContainer: {
    alignSelf: 'flex-end',
    marginRight: -20,
    marginTop: -110,
  },
  busImage: {
    width: width * 0.75,
    height: width * 0.5,
  },
  yusWrapper: {
    marginTop: -3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SplashScreen;