// SearchScreen.jsx - Updated with Option 3 (Best Approach)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Animated,
  Modal,
  Dimensions,
  Image
} from "react-native";
import { StatusBar } from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import LightTheme from "../constants/Colours";
import webSocketService from "../services/WebSocketService";
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Linking } from "react-native";




const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function SearchScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const theme = LightTheme;
  const styles = createStyles(theme);

  // State variables
  const [searchType, setSearchType] = useState("srcDest");
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stop, setStop] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [busPreview, setBusPreview] = useState(null);
  const [busList, setBusList] = useState([]);
  const [buttonScale] = useState(new Animated.Value(1));
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [allRoutes, setAllRoutes] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  
  // ✅ NEW: State for timetable data
  const [timetableData, setTimetableData] = useState([]);

  // Animation refs
  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backgroundPosition = useRef(new Animated.Value(searchType === "srcDest" ? 0 : 1)).current;

  // Update animation when searchType changes
  useEffect(() => {
    Animated.timing(backgroundPosition, {
      toValue: searchType === "srcDest" ? 0 : 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [searchType]);

  // ✅ OPTIMIZED: Fetch routes when screen opens - INCLUDES timetable formatting
  useEffect(() => {
    if (isFocused) {
      fetchCurrentRoutes();
    }
  }, [isFocused]);

  // Helper function to convert API data
  function convertToRoutes(data){
    if (Array.isArray(data)) {
      if(data.length==0){
        return null;
      }
      const routes = data
        .filter(item => item.stops !== null)
        .map(item => ({
          route_id: item.route_id,
          bus_id: item.bus_id,
          driver_id: item.driver_id,
          direction: item.direction,
          route_name: item.route_name,
          src: item.src,
          dest: item.dest,
          stops: item.stops,
          is_Stop: item.is_Stop,
          active: item.active
        }));
      return routes;
    }
  }

  // ✅ NEW: Function to format routes for timetable
  const formatRoutesForTimetable = (data) => {
    return data
      .filter(r => r.direction === "UP" && r.stops && r.stops.length > 0)
      .map(r => ({
        source: r.src,
        destination: r.dest,
        busNo: r.bus_id,
        time: r.stops[0]?.departure_time || "N/A",
        route: r.stops.map(s => s.location_name).join(", "),
      }));
  };

  // ✅ UPDATED: Fetch current routes from API - now also formats timetable data
  const fetchCurrentRoutes = async () => {
    try {
      const res = await fetch("https://yus.kwscloud.in/yus/get-current-bus-routes");
      const data = await res.json();

      let routes = convertToRoutes(data);
      setAllRoutes(routes);

      // ✅ FORMAT AND STORE TIMETABLE DATA
      const formattedTimetable = formatRoutesForTimetable(data);
      setTimetableData(formattedTimetable);

      // Collect all src + dest from every route
      const srcDestList = [
        ...data.map(r => r.src),
        ...data.map(r => r.dest)
      ];

      // Remove duplicates + nulls
      const uniqueSrcDest = [...new Set(srcDestList.filter(Boolean))];
      setAllLocations(uniqueSrcDest);
    } catch (error) {
      console.log("Error fetching routes:", error);
    }
  };

  // Clear fields when focused
  useEffect(() => {
    if (isFocused) clearAllFields();
  }, [isFocused]);

  const clearAllFields = () => {
    setSource("");
    setDestination("");
    setStop("");
    setBusNumber("");
    setBusPreview(null);
    setBusList([]);
  };

  // Drawer functions
  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.spring(drawerAnimation, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnimation, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setDrawerVisible(false));
  };

  // Hamburger Menu Component (unchanged)
  const AnimatedHamburger = ({ onPress, style, isOpen }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.hamburgerButton, style]}
      >
        <Ionicons
          name={isOpen ? "close" : "menu"}
          size={28}
          color="#000"
        />
      </TouchableOpacity>
    );
  };

  // ✅ UPDATED: Render drawer with X icon inside drawer when open
  const renderDrawer = () => (
    <Modal
      visible={drawerVisible}
      transparent
      animationType="none"
      onRequestClose={closeDrawer}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop */}
        <TouchableOpacity 
          style={styles.drawerBackdrop} 
          activeOpacity={1} 
          onPress={closeDrawer}
        />

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: drawerAnimation }] },
          ]}
        >
          <View style={styles.drawerContent}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.logoContainer}>
                
                 <Image
  source={require("../assets/logo.png")}   
  style={styles.drawerLogo}
/>

              </View>
              <Text style={styles.drawerAppName}>YELLOH BUS</Text>
            </View>

            {/* Menu */}
            <View style={styles.drawerMenuSection}>
              
              <TouchableOpacity 
                style={styles.drawerMenuItem} 
                onPress={() => {
                  closeDrawer();
                  navigation.navigate("Search");
                }}
              >
                <Ionicons name="home-outline" size={24} color="#333" />
                <Text style={styles.drawerMenuText}>Home</Text>
              </TouchableOpacity>

              {/* ✅ OPTIMIZED TIMETABLE OPTION - PASSES PRE-FORMATTED DATA */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  closeDrawer();
                  // ✅ PASS PRE-FORMATTED TIMETABLE DATA
                  navigation.navigate("Timetable", { 
                    timetableData: timetableData,
                    // Optional: pass raw data for refresh capability
                    rawDataAvailable: true
                  });
                }}
              >
                <Ionicons name="calendar-outline" size={24} color="#333" />
                <Text style={styles.drawerMenuText}>Timetable</Text>
              </TouchableOpacity>

              <TouchableOpacity 
  style={styles.drawerMenuItem} 
  onPress={() => {
    closeDrawer();
    Linking.openURL(
  "mailto:yusofficialteam@gmail.com?subject=YUS Support&body=Hi YUS Team,%0A%0AI need help with..."
);

  }}
>
  <Ionicons name="help-circle-outline" size={24} color="#333" />
  <Text style={styles.drawerMenuText}>Help & Support</Text>
</TouchableOpacity>

<TouchableOpacity 
  style={styles.drawerMenuItem} 
  onPress={() => {
    closeDrawer();
    Linking.openURL("https://yus.kwscloud.in");
  }}
>
  <Ionicons name="information-circle-outline" size={24} color="#333" />
  <Text style={styles.drawerMenuText}>About</Text>
</TouchableOpacity>


              <TouchableOpacity
  style={styles.drawerMenuItem}
  onPress={() => {
    closeDrawer();
    Linking.openURL("https://yus.kwscloud.in/yus/privacy-policy");
  }}
>
  <Ionicons name="document-text-outline" size={24} color="#333" />
  <Text style={styles.drawerMenuText}>Privacy Policy</Text>
</TouchableOpacity>



            </View>

            {/* Footer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Powered by YUS💛 </Text>
            </View>
          </View>
        </Animated.View>
        
        
      </View>
    </Modal>
  );

  // Suggestion handlers
  const handleSourceSuggestion = (text) => {
    setSource(text);
    if (!text.trim()) {
      setSourceSuggestions([]);
      return;
    }
    const filtered = allLocations.filter((item) =>
      item.toLowerCase().startsWith(text.toLowerCase())
    );
    setSourceSuggestions(filtered);
  };

  const handleDestinationSuggestion = (text) => {
    setDestination(text);
    if (!text.trim()) {
      setDestinationSuggestions([]);
      return;
    }
    const filtered = allLocations.filter((item) =>
      item.toLowerCase().startsWith(text.toLowerCase())
    );
    setDestinationSuggestions(filtered);
  };

  // Fetch bus preview
  const fetchBusPreview = async (text) => {
    let busID_to_search = text.trim();
    if (!busID_to_search) {
      setBusPreview(null);
      return;
    }
    const foundRoute = allRoutes.find(r => r.bus_id == busID_to_search);
    setBusPreview(foundRoute || null);
  };

  // Debounce bus number input
  useEffect(() => {
    const handler = setTimeout(() => fetchBusPreview(busNumber), 300);
    return () => clearTimeout(handler);
  }, [busNumber]);

  // Search Handler
  const handleFindBus = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      if (searchType === "srcDest") {
        if (!source.trim() || !destination.trim()) {
          Alert.alert("Missing Fields", "Please enter both source and destination.");
          return;
        }
        
        const foundRoute = allRoutes.filter(
          r => r.src == source.trim() && r.dest == destination.trim()
        );

        let actual_route = foundRoute;
        if (foundRoute.length==0){
          const url = `https://yus.kwscloud.in/yus/src-${source.trim()}&dest-${destination.trim()}`;
          const response = await fetch(url);
          const data = await response.json();
          let route = convertToRoutes(data);

          if (route==null){
            Alert.alert("Not Found", "No Bus found with this source and destination.");
            setSource("");
            setDestination("");
            return;
          }

          actual_route = route;
          if (Array.isArray(route)) {
            setAllRoutes(prev => [...prev, ...route]);
          } else {
            setAllRoutes(prev => [...prev, route]);
          }

          setAllLocations(prev => {
            const updated = [...prev, route.src, route.dest];
            return [...new Set(updated)];
          });
        }

        if(!Array.isArray(actual_route)){
          actual_route = [actual_route];
        }

        navigation.navigate("BusList", { 
          buses: actual_route,
          src: source, 
          dest: destination, 
          searchType: "srcDest" 
        });
        
      } else if (searchType === "busNo") {
        if (!busNumber.trim()) {
          Alert.alert("Missing Field", "Please enter bus number.");
          return;
        }

        const foundRoute = allRoutes.find(r => 
          r.bus_id == busNumber.trim() && r.active === true
        );
          
        if(foundRoute==undefined){
          Alert.alert("Not Found", "No bus found with this number.");
          return;
        }
          
        navigation.navigate("BusList", { 
          buses: [foundRoute], 
          searchType: "busNo", 
          busNumber: foundRoute.bus_id
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to search for buses. Please try again.");
    }
  };

  // ✅ UPDATED: Header hamburger - ONLY when drawer is closed
  const renderHeader = () => (
  <View style={[styles.headerSection, { backgroundColor: theme.GOLD_START }]}>
    
    {/* SAME POSITION – ICON CHANGES */}
    <AnimatedHamburger 
      onPress={drawerVisible ? closeDrawer : openDrawer}
      isOpen={drawerVisible}
    />

    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerTitle}>YELLOH BUS</Text>
    </View>
  </View>
);


  const renderSearchTypeSelector = () => (
    <View style={styles.searchTypeSection}>
      <View style={{ marginTop: -20 }} />
      <Text style={styles.sectionLabel}>Choose Search Method</Text>
      
      {/* Animated Radio Switch Container */}
      <View style={styles.radioSwitchContainer}>
        {/* Background Slider */}
        <Animated.View 
          style={[
            styles.radioBackground,
            {
              left: backgroundPosition.interpolate({
                inputRange: [0, 1],
                outputRange: ['2%', '50%']
              })
            }
          ]} 
        />
        
        {/* DIRECT Option */}
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => setSearchType("srcDest")}
          activeOpacity={0.9}
        >
          <View style={styles.radioIcon}>
            <MaterialIcons 
              name="route" 
              size={16} 
              color={searchType === "srcDest" ? "#5a3a00" : theme.textSecondary} 
            />
          </View>
          <Text style={[
            styles.radioLabel,
            searchType === "srcDest" && styles.radioLabelActive
          ]}>
            DIRECT
          </Text>
        </TouchableOpacity>

        {/* BUS NO Option */}
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => setSearchType("busNo")}
          activeOpacity={0.9}
        >
          <View style={styles.radioIcon}>
            <FontAwesome5 
              name="bus" 
              size={14} 
              color={searchType === "busNo" ? "#5a3a00" : theme.textSecondary} 
            />
          </View>
          <Text style={[
            styles.radioLabel,
            searchType === "busNo" && styles.radioLabelActive
          ]}>
            BUS NO
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchByBusNumber = () => (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          backgroundColor: "#ffffff",
          padding: 15,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View
            style={{
              height: 48,
              width: 48,
              borderRadius: 24,
              backgroundColor: "#efe2ca",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="search" size={22} color="#000" />
          </View>

          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#000" }}>Spot Bus</Text>
            <Text style={{ fontSize: 12, color: "#777" }}>Track by bus number</Text>
          </View>
        </View>

        <View
          style={{
            borderWidth: 3,
            borderColor: "#e6b645",
            borderRadius: 18,
            paddingVertical: 8,
            alignItems: "center",
            backgroundColor: "#fff",
            marginBottom: 10,
          }}
        >
          <TextInput
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: "#555",
              textAlign: "center",
              letterSpacing: 2,
              width: "100%",
            }}
            placeholder="27"
            placeholderTextColor="#b0b0b0"
            value={busNumber}
            onChangeText={setBusNumber}
            keyboardType="numeric"
            maxLength={4}
          />
        </View>
        
        <Text style={{ textAlign: "center", color: "#888", fontSize: 10 }}>
          Enter Bus Number
        </Text>
      </View>
     {renderSearchButton()}
    </View>

  
  );

  const renderSearchBySourceDest = () => (
    <View style={{ marginBottom: 100, position: "relative", zIndex: 1 }}>
      {/* CARD */}
      <View
        style={{
          backgroundColor: "#ffffff",
          padding: 15,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
          overflow: "visible",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View
            style={{
              height: 48,
              width: 48,
              borderRadius: 24,
              backgroundColor: "#efe2ca",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="search" size={22} color="#000" />
          </View>

          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#000" }}>Find Bus Route</Text>
            <Text style={{ fontSize: 12, color: "#777" }}>Track by bus route</Text>
          </View>
        </View>

        {/* SIDE-BY-SIDE */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* FROM */}
          <View style={{ flex: 1, marginRight: 10, position: "relative", zIndex: 200 }}>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>FROM</Text>
            <View
              style={{
                borderWidth: 3,
                borderColor: "#e6b645",
                borderRadius: 18,
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: "#fff",
              }}
            >
              <TextInput
                style={{ fontSize: 16, fontWeight: "600", color: "#555" }}
                placeholder="Source"
                placeholderTextColor="#b0b0b0"
                value={source}
                onChangeText={handleSourceSuggestion}
              />
            </View>

            {/* SOURCE SUGGESTIONS */}
            {sourceSuggestions.length > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 100,
                  left: 0,
                  right: 0,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#ddd",
                  maxHeight: 300,
                  width: "150%", 
                  maxWidth: 1000,
                  zIndex: 200,
                  elevation: 20,
                  marginLeft: -20,
                }}
              >
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {sourceSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{ padding: 12, borderBottomWidth: 1, borderColor: "#eee" }}
                      onPress={() => {
                        setSource(item);
                        setSourceSuggestions([]);
                      }}
                    >
                      <Text style={{ color: "#555", padding: 5 }}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ARROW */}
          <View style={{ width: 50, height: 100, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 34, fontWeight: "900", color: "#444", marginTop: 20 }}>
              {">>"}
            </Text>
          </View>

          {/* TO */}
          <View style={{ flex: 1, marginLeft: 10, position: "relative", zIndex: 200 }}>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>TO</Text>
            <View
              style={{
                borderWidth: 3,
                borderColor: "#e6b645",
                borderRadius: 18,
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: "#fff",
              }}
            >
              <TextInput
                style={{ fontSize: 16, fontWeight: "600", color: "#555" }}
                placeholder="Destination"
                placeholderTextColor="#b0b0b0"
                value={destination}
                onChangeText={handleDestinationSuggestion}
              />
            </View>

            {/* DESTINATION SUGGESTIONS */}
            {destinationSuggestions.length > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 100,
                  left: 0,
                  right: 0,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#ddd",
                  maxHeight: 300,
                  width: "150%", 
                  maxWidth: 1000,
                  zIndex: 200,
                  elevation: 20,
                  marginLeft: -45,
                }}
              >
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {destinationSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{ padding: 12, borderBottomWidth: 1, borderColor: "#eee" }}
                      onPress={() => {
                        setDestination(item);
                        setDestinationSuggestions([]);
                      }}
                    >
                      <Text style={{ color: "#555", padding: 5 }}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* FIND BUS BUTTON */}
      <Animated.View
        style={{
          transform: [{ scale: buttonScale }],
          marginTop: 10,
          zIndex: -1,
        }}
      >
        <TouchableOpacity
          style={styles.searchButtonOuter}
          onPress={handleFindBus}
          activeOpacity={0.9}
        >
          <LinearGradient
            start={{x:0, y:0}}
            end={{x:1, y:0}}
            colors={["#f3c156ff", "#f1b21a"]}
            style={styles.searchButtonGradient}
          >
            <Text style={styles.searchButtonText}>Find Bus</Text>
            {/* <MaterialCommunityIcons name="bus-stop" color="#000" size={25} style={{ marginLeft: 2 }}  />
            <MaterialCommunityIcons name="bus" size={25} color="#000" style={{ marginLeft: 2 }} /> */}
            <MaterialCommunityIcons name="bus-side" color="#000" size={25} style={{ marginLeft: 2 }} />
            {/* <MaterialCommunityIcons name="bus-marker" color="#000" size={25}  style={{ marginLeft: 2 }}/> */}
             {/* <MaterialCommunityIcons name="bus-electric" color="#000" size={24} /> */}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderSearchButton = () => (
    <Animated.View style={{ transform: [{ scale: buttonScale }], zIndex: 1, position: "relative" }}>
      <TouchableOpacity 
        style={styles.searchButtonOuter}
        onPress={handleFindBus} 
        activeOpacity={0.9}
      >
        <LinearGradient
          start={{x:0, y:0}}
          end={{x:1, y:0}}
          colors={["#f3c156ff", "#f1b21a"]}
          style={styles.searchButtonGradient}
        >
          <Text style={styles.searchButtonText}>Find Bus</Text>
           <MaterialCommunityIcons name="bus-side" color="#000" size={25} style={{ marginLeft: 2 }} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

return (
  <KeyboardAvoidingView
  style={styles.container}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
>
  {/* STATUS BAR CONFIG */}
  <StatusBar backgroundColor="#000000" barStyle="light-content" />

  {/*  THIS VIEW FILLS ONLY TOP GAP */}
  <View style={{ height: StatusBar.currentHeight, backgroundColor: "#000" }} />

  {renderDrawer()}

  <ScrollView
  contentContainerStyle={styles.scrollContainer}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="on-drag"
>

    {renderHeader()}
    {renderSearchTypeSelector()}

    <View style={{ marginBottom: 30 }}>
      {searchType === "busNo" && renderSearchByBusNumber()}
      {searchType === "srcDest" && renderSearchBySourceDest()}
    </View>
  </ScrollView>
</KeyboardAvoidingView>

);

}

const createStyles = (theme) => {
  const GOLD_START = "#edae25ff";
  const GOLD_END = "#f1b21a";
  const GOLD_DARK = "#c98a00";
  const GLASS_BG = "rgba(255,255,255,0.88)";
  const CARD_BORDER = "rgba(255, 255, 255, 0.6)";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,

    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
      paddingTop: 60,
    },
    headerSection: {
      marginTop:-60,
      marginBottom: 40,
      flexDirection: 'row',
      alignItems: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      justifyContent: 'space-between',
      zIndex: 100,
      elevation: 15,
      position: "relative",
      marginRight:-20,
      marginLeft:-20
    },
    hamburgerButton: {
  padding: 15,              // touch area safe
  zIndex: 99999,
  elevation: 20,
  position: "absolute",
},

    toggle: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    bar: {
      width: 28,
      height: 3,
      backgroundColor: "#D4A53A",
      borderRadius: 3,
    },
    barSmall: {
      width: 20,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#000',
      textAlign: "left",
    },
    // Drawer Styles 
    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
      zIndex: 1,
      elevation: 1,
    },
    drawerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      position: "absolute",
    },
    drawerContainer: {
      width: DRAWER_WIDTH,
      height: '100%',
      position: 'absolute',
      left: 0,
      top: 0,  
      zIndex: 2,
      elevation: 2,
    },
  drawerLogo: {
  width: 140,
  height: 70,
  resizeMode: "contain",
},


    drawerContent: {
      flex: 1,
      backgroundColor: '#fff',
    },
    drawerHeader: {
      alignItems: 'center',
      paddingVertical: 25,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    logoContainer: {
      marginBottom: 12,
       alignItems: "center",
    },
    drawerAppName: {
      fontSize: 28,
      fontWeight: '900',
      color: '#D4A53A',
      letterSpacing: 1,
      marginBottom: 8,
      textAlign: 'center',
    },
    drawerVersion: {
      fontSize: 14,
      color: '#5A5A5A',
      fontWeight: '600',
      textAlign: 'center',
    },
    drawerMenuSection: {
      flex: 1,
      paddingVertical: 20,
    },
    drawerMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 25,
    },
    drawerMenuText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333333',
      marginLeft: 20,
    },
    menuDivider: {
      height: 1,
      backgroundColor: '#E0E0E0',
      marginVertical: 10,
      marginHorizontal: 25,
    },
    drawerFooter: {
      padding: 25,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#E0E0E0',
    },
    drawerFooterText: {
      fontSize: 14,
      color: '#5A5A5A',
      fontWeight: '500',
      textAlign: 'center',
    },
    searchTypeSection: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.textSecondary,
      marginBottom: 12,
      textAlign: 'center',
    },
    // Radio Switch Styles
    radioSwitchContainer: {
      borderWidth: 2,
      borderColor: GOLD_START,
      borderRadius: 30,
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      height: 50,
      width: '100%',
      overflow: 'hidden',
      backgroundColor: GLASS_BG,
    },
    radioBackground: {
      position: 'absolute',
      width: '53%',
      height: 50,
      backgroundColor: GOLD_START,
      top: 2,
      marginLeft: -10,
      marginTop: -4,
      borderRadius: 5000,
      zIndex: 1,
    },
    radioOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 30,
      position: 'relative',
      overflow: 'hidden',
      zIndex: 2,
    },
    radioIcon: {
      marginRight: 8,
    },
    radioLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
      letterSpacing: 0.5,
    },
    radioLabelActive: {
      color: "#5a3a00",
      fontWeight: "bold",
    },
    inputSection: {
      marginBottom: 18,
    },
    searchButtonOuter: {
      position: "relative",
      zIndex: 1,
      borderRadius: 28,
      overflow: "visible",
      marginTop: 20,
      marginBottom: 8,
      alignSelf: "center",
      width: "100%",
      maxWidth: 420,
      shadowColor: GOLD_DARK,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 8,
    },
    searchButtonGradient: {
      paddingVertical: 18,
      paddingHorizontal: 26,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    searchButtonText: {
      fontSize: 18,
      fontWeight: "800",
      color: "#000",
      marginRight: 8,
      textShadowColor: "rgba(0,0,0,0.08)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    inputContainer: {
      position: 'relative',
      zIndex: 1000,
    },
    suggestionBox: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#f0c876",
      borderRadius: 10,
      marginTop: 5,
      maxHeight: 150,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 2,
    },
    suggestionScroll: {
      maxHeight: 150,
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
    },
    suggestionText: {
      fontSize: 16,
      color: "#333",
      textAlign: "center",
    },
  });
};