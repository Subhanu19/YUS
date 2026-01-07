import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { StatusBar } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import WebSocketService from "../services/WebSocketService";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Helper to calculate distance (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}

export default function BusListScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const {
    src,
    dest,
    buses: initialBuses,
    searchType,
    busNumber,
    source,
    destination,
    stop,
  } = route.params || {};

  const [buses, setBuses] = useState(initialBuses || []);
  const [loading, setLoading] = useState(!initialBuses);
  const [error, setError] = useState(null);
  const GOLD_START = "#edae25ff";
  const actualSource = src || source;
  const actualDestination = dest || destination;

  // Animation ref (for smooth bus movement)
  const busAnim = useRef(new Animated.Value(0)).current;
  const [currentStopIndex, setCurrentStopIndex] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // ----- Fetch buses -----
  useEffect(() => {
    console.log("current buses - ", buses);
    if (initialBuses && initialBuses.length > 0) {
      setLoading(false);
      return;
    }
  }, [actualSource, actualDestination, stop, searchType, busNumber, initialBuses]);

  // ----- WebSocket: Real-time updates -----
  useEffect(() => {
    const unsubscribe = WebSocketService.subscribe((data) => {
      if (!data || !data.latitude || !data.longitude) return;

      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);

      // Find nearest stop
      if (buses.length > 0 && buses[0]?.stops?.length > 0) {
        const stops = buses[0].stops;
        let nearestIndex = 0;
        let minDist = Infinity;

        for (let i = 0; i < stops.length; i++) {
          const stop = stops[i];
          if (!stop.latitude || !stop.longitude) continue;

          const dist = getDistance(
            lat,
            lon,
            parseFloat(stop.latitude),
            parseFloat(stop.longitude)
          );
          if (dist < minDist) {
            minDist = dist;
            nearestIndex = i;
          }
        }

        if (!initialized) {
          setCurrentStopIndex(nearestIndex);
          busAnim.setValue(nearestIndex);
          setInitialized(true);
        } else {
          Animated.timing(busAnim, {
            toValue: nearestIndex,
            duration: 800,
            useNativeDriver: false,
          }).start();
          setCurrentStopIndex(nearestIndex);
        }
      }
    });

    return () => unsubscribe();
  }, [buses, initialized]);

  // ----- Bus card press -----
  const handleBusPress = (bus) => {
    if (!bus || !bus.bus_id) {
      Alert.alert("Error", "Invalid bus data");
      return;
    }

    const payload = {
      bus_id: bus.bus_id,
      route_id: bus.route_id,
      route_name: bus.route_name,
      driver_id: bus.driver_id,
      direction: bus.direction,
    };

    WebSocketService.send(payload);

    navigation.navigate("Schedule", {
      busObject: bus,
      searchType,
      busNumber: searchType === "busNo" ? busNumber : null,
      source: actualSource,
      destination: actualDestination,
      stop: searchType === "srcDestStop" ? stop : null,
    });
  };

  const isKCET = (name) => name?.toLowerCase() === "kcet";

  // ----- Render bus card -----
  const renderBusCard = ({ item }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.busCard,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => handleBusPress(item)}
      >
        {/* Header Row */}
<View style={styles.cardTopRow}>

  {/* LEFT GROUP */}
  <View style={styles.busHeaderLeft}>
    <View style={styles.busIconCircle}>
      <MaterialCommunityIcons name="bus" size={22} color="#FFF" />
    </View>

    <Text style={styles.cardBusNumber}>
      Bus - {item.bus_id}
    </Text>
  </View>

  {/* RIGHT GROUP */}
  <View style={styles.stopPill}>
    <Text style={styles.stopPillText}>
      {item.stops?.length || 0} stops
    </Text>
  </View>

</View>


        {/* Route Title */}
        <Text style={styles.cardRouteTitle}>{item.route_name}</Text>

        {/* Path Row - FIXED ALIGNMENT */}
        <View style={styles.pathRow}>
          <View style={styles.pathGraphic}>
            {/* START STOP */}
            <View style={styles.stopContainer}>
              {isKCET(item.stops?.[0]?.location_name) ? (
                <MaterialCommunityIcons
                  name="school"
                  size={32}
                  color={GOLD_START}
                />
              ) : (
                <MaterialCommunityIcons
                  name="bus-stop-uncovered"
                  size={34}
                  color={GOLD_START}
                />
              )}
              <Text style={styles.stopLabel} numberOfLines={1}>
                {item.stops?.[0]?.location_name || "Start"}
              </Text>
            </View>

            {/* DOTTED LINE */}
            <View style={styles.lineContainer}>
              <View style={styles.dottedLine} />
            </View>

            {/* BUS ICON */}
            <View style={styles.busContainer}>
              <MaterialCommunityIcons
                name="bus-side"
                size={32}
                color={GOLD_START}
              />
            </View>

            {/* DOTTED LINE */}
            <View style={styles.lineContainer}>
              <View style={styles.dottedLine} />
            </View>

            {/* END STOP */}
            <View style={styles.stopContainer}>
              {isKCET(item.stops?.[item.stops.length - 1]?.location_name) ? (
                <MaterialCommunityIcons
                  name="school"
                  size={32}
                  color={GOLD_START}
                />
              ) : (
                <MaterialCommunityIcons
                  name="bus-stop-uncovered"
                  size={32}
                  color={GOLD_START}
                />
              )}
              <Text style={styles.stopLabel} numberOfLines={1}>
                {item.stops?.[item.stops.length - 1]?.location_name || "End"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const getHeaderTitle = () => {
    if (searchType === "busNo" && busNumber) return `Bus #${busNumber}`;
    else if (
      searchType === "srcDestStop" &&
      actualSource &&
      actualDestination &&
      stop
    )
      return `${actualSource} → ${stop} → ${actualDestination}`;
    else if (actualSource && actualDestination)
      return `${actualSource} → ${actualDestination}`;
    else return "Available Buses";
  };

  const getSubtitle = () => {
    if (searchType === "busNo") return "Bus details";
    else if (searchType === "srcDestStop") return `Via ${stop}`;
    else return `${buses.length} bus${buses.length !== 1 ? "es" : ""} found`;
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.GOLD_START} />
        <Text style={[styles.loadingText, { color: theme.textDark }]}>
          Loading buses...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.cleanHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons
                name="bus"
                size={28}
                color="#000"
              />
            </View>
            <Text style={styles.headerTitle}>Bus Details</Text>
            <View style={styles.headerIcon} />
          </View>
        </View>

        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.textLight }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.GOLD_START }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryButtonText, { color: theme.secondary }]}>
              Back to Search
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* STATUS BAR CONFIG */}
      <StatusBar backgroundColor="#000000" barStyle="light-content" />

      {/* THIS VIEW FILLS ONLY TOP GAP */}
      <View style={{ height: StatusBar.currentHeight, backgroundColor: "#000" }} />

      {/* CLEAN HEADER */}
      <View style={styles.cleanHeader}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="checkbox-marked-circle-outline"
              size={30}
              color="#000"
            />
          </View>
          <Text style={styles.headerTitle}>Alloted Buses</Text>
          <View style={styles.headerIcon} />
        </View>
      </View>

      <FlatList
        data={buses}
        keyExtractor={(item) =>
          item.bus_id?.toString() || Math.random().toString()
        }
        renderItem={renderBusCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.noData, { color: theme.textLight }]}>
              No buses found
            </Text>
            <Text style={[styles.noDataSubtitle, { color: theme.textLight }]}>
              Try adjusting your search criteria
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    
    // Clean Header Styles
    cleanHeader: {
      backgroundColor: theme.GOLD_START,
      paddingTop: 6,
      alignItems: "center",
      paddingHorizontal: 20,
      minHeight: 60,
    },
    headerRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerIcon: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: "#000",
    },
    headerSubtle: {
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
      opacity: 0.9,
    },

    listContent: {
      paddingHorizontal: 15,
      paddingBottom: 30,
      paddingTop: 50,
    },

    busCard: {
      backgroundColor: "#fff",
      borderRadius: 30,
      padding: 16,
      height: 165,
      marginBottom: 18,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },

   cardTopRow: {
  flexDirection: "row",
  alignItems: "center",
},

  cardBusNumber: {
  fontSize: 22,
  fontWeight: "900",
  color: "#000",
  letterSpacing: -1,
},

    busIconCircle: {
      width: 39,
      height: 39,
      borderRadius: 28,
      backgroundColor: theme.GOLD_START,
      justifyContent: "center",
      alignItems: "center",
    },

   stopPill: {
  marginLeft: "auto",   // 🔥 PUSHES pill to right
  backgroundColor: "#E8DCC8",
  paddingHorizontal: 24,
  paddingVertical: 10,
  borderRadius: 25,
},

    stopPillText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#000",
    },

    cardRouteTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#000",
      marginBottom: 8,
      marginTop: 8,
      textAlign: "left",
    },

    pathRow: {
      marginTop: 5,
    },

    // FIXED PATH GRAPHIC ALIGNMENT
    pathGraphic: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 48,
    },

    stopContainer: {
      width: 70,
      alignItems: "center",
      justifyContent: "center",
    },

    lineContainer: {
      flex: 1,
      height: 2,
      justifyContent: "center",
      marginHorizontal: 1,
    },

    dottedLine: {
      height: 4,
      borderBottomWidth: 2,
      borderStyle: "dashed",
      borderColor: theme.GOLD_START,
    },

    busContainer: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
    },

    stopLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#000",
      marginTop: 4,
      textAlign: "center",
    },

    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.secondary,
    },

    loadingText: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: "500",
    },

    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },

    errorText: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 22,
    },

    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      minWidth: 160,
    },

    retryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },

    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },

    noData: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 8,
    },

    noDataSubtitle: {
      fontSize: 14,
      fontWeight: "400",
    },

   busHeaderLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  flexShrink: 1,     // 🔥 IMPORTANT
},

  });