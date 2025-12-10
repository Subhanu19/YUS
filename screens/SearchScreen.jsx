// Image URL (uploaded file):
// /mnt/data/WhatsApp Image 2025-11-23 at 6.36.05 PM.jpeg

import React, { useState, useEffect, useRef, act } from "react";
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
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import LightTheme from "../constants/Colours";
import webSocketService from "../services/WebSocketService";
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function SearchScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const theme = LightTheme;
  const styles = createStyles(theme);


const AnimatedHamburger = ({ onPress, isOpen, style }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bar2Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const toValue = isOpen ? 1 : 0;

    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(bar2Scale, {
        toValue: isOpen ? 0 : 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const bar1Rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const bar3Rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-45deg"],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.hamburgerButton, style]}
    >
      <Animated.View style={[styles.toggle, { transform: [{ rotate: rotation }] }]}>
        
        <Animated.View
          style={[
            styles.bar,
            styles.barSmall,
            { transform: [{ rotate: bar1Rotate }] },
          ]}
        />

        <Animated.View
          style={[
            styles.bar,
            { transform: [{ scaleX: bar2Scale }] },
          ]}
        />

        <Animated.View
          style={[
            styles.bar,
            styles.barSmall,
            { transform: [{ rotate: bar3Rotate }] },
          ]}
        />

      </Animated.View>
    </TouchableOpacity>
  );
};

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

  // SOURCE Suggestion
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

// DESTINATION Suggestion
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



  const drawerAnimation = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  
  // Animation values for the radio switch
  const backgroundPosition = useRef(new Animated.Value(searchType === "srcDest" ? 0 : 1)).current;

  

  // Update animation when searchType changes
  useEffect(() => {
    Animated.timing(backgroundPosition, {
      toValue: searchType === "srcDest" ? 0 : 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [searchType]);

  // WebSocket Connection
  useEffect(() => {
    if (isFocused) {
      webSocketService.connect();
    }
    return () => {};
  }, [isFocused]);

  // Subscribe to bus updates
  // useEffect(() => {
  //   const unsubscribe = webSocketService.subscribe((data) => {
  //     if (data.type === "bus_update" && data.bus_id === busNumber) {
  //       setBusPreview((prev) => ({ ...prev, ...data }));
  //     }
  //     if (Array.isArray(data)) {
  //       setBusList(data);
  //     }
  //   });
  //   return () => unsubscribe();
  // }, [busNumber]);
  
  // Fetch all available routes when screen opens

  useEffect(() => {
  if (isFocused) {
    fetchCurrentRoutes();
  }
}, [isFocused]);

function convertToRoutes(data){
   if (Array.isArray(data)) {

    if(data.length==0){
      return null
    }
      const routes = data
        .filter(item => item.stops !== null)   // remove only routes with null stops
        .map(item => ({
          route_id: item.route_id,
          bus_id: item.bus_id,
          driver_id:item.driver_id,
          direction: item.direction,
          route_name: item.route_name,
          src: item.src,
          dest: item.dest,
          stops: item.stops,     // already guaranteed not null
          is_Stop: item.is_Stop,
          active: item.active
    }));

    return routes
  }
}

const fetchCurrentRoutes = async () => {
  try {
    const res = await fetch("https://yus.kwscloud.in/yus/get-current-bus-routes");
    const data = await res.json();

    let routes=convertToRoutes(data)
    setAllRoutes(routes)

    // 2️⃣ Collect ALL src + dest from every route (even null-stops)
      const srcDestList = [
        ...data.map(r => r.src),
        ...data.map(r => r.dest)
      ];

      // 3️⃣ Remove duplicates + nulls
      const uniqueSrcDest = [...new Set(srcDestList.filter(Boolean))];

      // Save for search box
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

  const handleReverseRoute = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  // Drawer animation
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

  // Fetch bus preview
  const fetchBusPreview = async (text) => {

   let busID_to_search= text.trim()

    if (!busID_to_search) {
      setBusPreview(null);
      return;
    }

    //fastest logic
    const foundRoute = allRoutes.find(r => r.bus_id == busID_to_search);
    setBusPreview(foundRoute || null); // if not found → null



            //simplest logic

    // let busID_found = false;

    // for(let i=0;i<allRoutes.length;i++){
    //   if(allRoutes[i].bus_id==busID_to_search){
    //     busID_found = true
    //     setBusPreview(allRoutes[i]) //set the available searched route for preview
    //   }
    // }

    // if (!busID_found){
    //    setBusPreview(null);
    // }



    

    // try {

    // console.log("request made ")
    //           const response = await fetch(
    //             `https://yus.kwscloud.in/yus/get-route?bus_id=${busID_to_search}`
    //           );
    //           const data = await response.json();
    //           if (data.route_id !== 0 && data.bus_id !== 0) {
    //             setBusPreview(data);
    //             webSocketService.send({ action: "subscribe_bus", bus_id: busID_to_search });
    //           } else {
    //             setBusPreview(null);
    //           }
    //         } catch (error) {
    //           setBusPreview(null);
    //         }
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

        let actual_route = foundRoute
        if (foundRoute.length==0){
          const url = `https://yus.kwscloud.in/yus/src-${source.trim()}&dest-${destination.trim()}`;
          const response = await fetch(url);
          const data = await response.json();
          let route = convertToRoutes(data)

          if (route==null){
            Alert.alert("Not Found", "No Bus found with this source and destination.");
            setSource("")
            setDestination("")
            return;
          }

          actual_route = route

          // 1. Add route(s)
          if (Array.isArray(route)) {
            setAllRoutes(prev => [...prev, ...route]);
          } else {
            setAllRoutes(prev => [...prev, route]);
          }

          // 2. Add source & destination safely
          setAllLocations(prev => {
            const updated = [...prev, route.src, route.dest];
            return [...new Set(updated)];   // remove duplicates
          });

        }

        if(!Array.isArray(actual_route)){
          actual_route = [actual_route]
        }

        console.log("actual route - ",actual_route)
        navigation.navigate("BusList", { 
          buses: actual_route,
          src: source, 
          dest: destination, 
          searchType: "srcDest" 
        });

      // } else if (searchType === "srcDestStop") {
      //   if (!source.trim() || !destination.trim() || !stop.trim()) {
      //     Alert.alert("Missing Fields", "Please enter source, destination, and stop.");
      //     return;
      //   }
      //   const url = `https://yus.kwscloud.in/yus/src-${source.trim()}&dest-${destination.trim()}&stop-${stop.trim()}`;
      //   const response = await fetch(url);
      //   const data = await response.json();
      //   if (!data || data === "null" || (Array.isArray(data) && data.length === 0)) {
      //     Alert.alert("Not Found", "No buses found for your search criteria.");
      //     return;
      //   }
      //   navigation.navigate("BusList", { 
      //     buses: data, 
      //     searchType, 
      //     source, 
      //     destination, 
      //     stop 
      //   });
      } else if (searchType === "busNo") {
        if (!busNumber.trim()) {
          Alert.alert("Missing Field", "Please enter bus number.");
          return;
        }


          //fastest logic
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
          busNumber :foundRoute.bus_id
        });
      }
    } catch (error) {
      console.log("error - ",error)
      Alert.alert("Error", "Failed to search for buses. Please try again.");
    }
  };

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
              <View style={styles.logoCircle}>
                <Ionicons name="bus" size={40} color="#D4A53A" />
              </View>
            </View>
            <Text style={styles.drawerAppName}>YELLOH BUS</Text>
            <Text style={styles.drawerVersion}>v 1.0.0</Text>
          </View>

          {/* Menu */}
          <View style={styles.drawerMenuSection}>
            
            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="home-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="time-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>Timetable</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="settings-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="help-circle-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>Help & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="information-circle-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>About</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="share-social-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>Share App</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="star-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>Rate Us</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.drawerMenuItem} onPress={closeDrawer}>
              <Ionicons name="trash-outline" size={24} color="#333" />
              <Text style={styles.drawerMenuText}>Clear Recent Searches</Text>
            </TouchableOpacity>

          </View>

          {/* Footer */}
          <View style={styles.drawerFooter}>
            <Text style={styles.drawerFooterText}>Made with 💬 for better commute</Text>
          </View>

        </View>
      </Animated.View>
            <AnimatedHamburger
        onPress={closeDrawer}
        isOpen={drawerVisible}
        style={{
          position: "absolute",
          top: 40,
          left: 20,
          zIndex: 9999,      // stays above drawer always
          elevation: 9999,
        }}
      />
    </View>
  </Modal>
);

  const renderHeader = () => (
    <View style={styles.headerSection}>
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
      <View style={{ marginTop: 40 }} />
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
          borderRadius: 22,
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
            borderRadius: 15,
            paddingVertical: 19,
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
          ENTER BUS NUMBER
        </Text>
      </View>
     { renderSearchButton()}
    </View>
  );


const renderSearchBySourceDest = () => (
  <View style={{ marginBottom: 20, position: "relative", zIndex: 1 }}>
    
    {/* CARD */}
    <View
      style={{
        backgroundColor: "#ffffff",
        padding: 15,
        borderRadius: 22,
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
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}>
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
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#000" }}>Plan Your Journey</Text>
          <Text style={{ fontSize: 12, color: "#777" }}>Find buses by route</Text>
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
              paddingVertical: 16,
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
                maxWidth:1000,
                zIndex: 200, // << SUPER IMPORTANT
                elevation: 20,
                marginLeft:-20,
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
                    <Text style={{ color: "#555" ,padding:5}}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ARROW */}
        <View style={{ width: 50, height: 125, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 34, fontWeight: "900", color: "#444", marginTop: -5 }}>
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
              paddingVertical: 16,
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
                maxWidth:1000,
                zIndex: 200,  // << SUPER IMPORTANT
                elevation: 20,
                marginLeft:-45,
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
                    <Text style={{ color: "#555" ,padding:5}}>{item}</Text>
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
        marginTop: 20,
        zIndex: -1, // << KEEP BUTTON BEHIND EVERYTHING
      }}
    >
      <TouchableOpacity
        style={styles.searchButtonOuter}
        onPress={handleFindBus}
        activeOpacity={0.9}
      >
        <LinearGradient
          start={{x:0, y:0}}
          end={{x:1,y: 0}}
          colors={["#f3c156ff", "#f1b21a"]}
          style={styles.searchButtonGradient}
        >
          <Text style={styles.searchButtonText}>Find Buses</Text>
          <Ionicons name="rocket" size={18} color="#000" style={{ marginLeft: 8 }} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  </View>
);


  const renderSearchButton = () => (
    <Animated.View style={{ transform: [{ scale: buttonScale }] ,zIndex : 1, position:"relative"}}>
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
          <Text style={styles.searchButtonText}>Find Buses</Text>
          <Ionicons name="rocket" size={18} color="#000" style={{ marginLeft: 8 }} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {renderDrawer()}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
      marginBottom: 26,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
       zIndex: 9999,   // ⭐ VERY IMPORTANT
  elevation: 15,  // for Android
  position: "relative",
    },
    hamburgerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      // elevation: 3,
        zIndex: 99999,      // ⭐ TOP OF EVERYTHING
  elevation: 20,      // ⭐ ANDROID
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
      backgroundColor: "#D4A53A", // Changed to match your gold theme
      borderRadius: 3,
    },
    barSmall: {
      width: 20, // 70%
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#D4A53A',
      textAlign: "left",
    },
    // Drawer Styles 
    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
      zIndex: 1,         // ⭐ LOWER THAN HEADER
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
    drawerContent: {
      flex: 1,
      backgroundColor: '#fff', // Your theme background color
    },
    drawerHeader: {
      alignItems: 'center',
      paddingVertical: 25,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    logoContainer: {
      marginBottom: 16,
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: '#D4A53A',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
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
    // New Radio Switch Styles
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
      marginLeft:-10,
      marginTop:-4,
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
      position : "relative",
      zIndex:1,
      borderRadius: 28,
      overflow: "visible",
      marginTop: 14,
      marginBottom: 28,
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
     inputSection: {
    marginBottom: 20,
  },
  journeyCard: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
jjourneyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
journeyIconContainer: {
  height: 48,
  width: 48,
  borderRadius: 24,
  backgroundColor: "#efe2ca",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},
journeyTitleContainer: {
  flex: 1,
},
journeyTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#000",
},
journeyInputsRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
},
journeyInputBlock: {
  flex: 1,
},
journeyLabel: {
  fontSize: 12,
  fontWeight: "700",
  color: "#555",
  marginBottom: 8,
  textAlign: "center",
},
journeyInputBox: {
  borderWidth: 2,
  borderColor: "#f0c876",
  borderRadius: 14,
  paddingVertical: 14,
  paddingHorizontal: 16,
  backgroundColor: "#fff",
  alignItems: "center",
},
journeyInput: {
  fontSize: 16,
  fontWeight: "600",
  color: "#222",
  textAlign: "center",
},
journeyArrow: {
  fontSize: 34,
  fontWeight: "900",
  color: "#444",
  includeFontPadding: false, // removes weird top spacing
  textAlignVertical: "center", // Android perfect centering
},

    // New styles for proper suggestion box positioning
    inputContainer: {
      position: 'relative',
      zIndex: 1000,
    },
    suggestionBox: {
      position: 'absolute',
      top: '100%', // Position below the input box
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