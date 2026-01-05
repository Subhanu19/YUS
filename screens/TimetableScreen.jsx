import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  Pressable
} from 'react-native';
import { StatusBar } from "react-native";
// Import your theme (assuming same structure as SearchScreen)
import LightTheme from "../constants/Colours";

const BusTimetable = ({ route }) => {
  const { timetableData } = route.params || {}; // Get pre-formatted data if passed
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoutes, setExpandedRoutes] = useState({});

  const theme = LightTheme; // Use your theme
  const styles = createStyles(theme); // Apply theme styles

  useEffect(() => {
    if (timetableData) {
      // Use pre-formatted data if available
      setRoutes(timetableData.map(route => ({
        ...route,
        stops: route.route ? route.route.split(", ") : []
      })));
      setLoading(false);
    } else {
      fetchTimetable();
    }
  }, [timetableData]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://yus.kwscloud.in/yus/get-current-bus-routes");
      const data = await res.json();
      const formatted = formatRoutes(data);
      setRoutes(formatted);
    } catch (e) {
      console.error("Error fetching timetable:", e);
      setRoutes(getSampleData());
    }
    setLoading(false);
  };

  const formatRoutes = (data) => {
    return data
      .filter(r => r.direction === "UP" && r.stops && r.stops.length > 0)
      .map(r => ({
        source: r.src,
        destination: r.dest,
        busNo: r.bus_id,
        time: r.stops[0].departure_time,
        route: r.stops.map(s => s.location_name).join(", "),
        stops: r.stops.map(s => s.location_name),
      }));
  };

  const getSampleData = () => [];

  const toggleRoute = (index) => {
    setExpandedRoutes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bus Trips</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary || "#D4A53A"} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading timetable...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
  {/* STATUS BAR CONFIG */}
  <StatusBar backgroundColor="#000000" barStyle="light-content" />

  {/*  THIS VIEW FILLS ONLY TOP GAP */}
  <View style={{ height: StatusBar.currentHeight, backgroundColor: "#000" }} />
      <View style={styles.header}>
        <Text style={styles.title}>Bus Trips</Text>
      </View>


      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {routes.map((route, index) => (
          <Pressable 
            key={index}
            style={styles.card}
            onPress={() => toggleRoute(index)}
          >
            <View style={styles.cardHeader}>
              {/* Fixed-width bus number badge */}
              <View style={styles.busBadge}>
                <Text style={styles.busNumber}>{route.busNo}</Text>
              </View>
              
              {/* Fixed-width time display */}
              <View style={styles.timeContainer}>
                <Text style={styles.time}>{route.time}</Text>
              </View>
              
              {/* Flexible route section with full text display */}
              <View style={styles.routeSection}>
                <Text style={styles.location}>{route.source}</Text>
                <View style={styles.arrowContainer}>
                  <View style={styles.arrowLine} />
                  <Text style={styles.arrowIcon}>▸</Text>
                </View>
                <Text style={styles.location}>{route.destination}</Text>
              </View>
            </View>
            
            {expandedRoutes[index] && (
              <View style={styles.expandedSection}>
                <Text style={styles.routeLabel}>Route ({route.stops.length} stops):</Text>
                <View style={styles.chipsContainer}>
                  {route.stops.map((stop, i) => (
                    <View key={i} style={styles.chip}>
                      <Text style={styles.chipText}>{stop}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {expandedRoutes[index] 
                  ? '▲ Tap to collapse' 
                  : `▼ Tap to view ${route.stops.length} stops`}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme) => {
  // Extract colors from your theme or use defaults
  const GOLD_START = "#edae25ff";
  const GOLD_END = "#f1b21a";
  const GOLD_DARK = "#c98a00";
  const GLASS_BG = "rgba(255,255,255,0.88)";
  
  return StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.background || "#f5f7fa"
    },
    header: {
      backgroundColor: theme.GOLD_START || "#fff",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor || "#e0e0e0",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    title: { 
      fontSize: 28, 
      fontWeight: "900", 
      color: "#000",
      textAlign: "center",
    },
    loadingContainer: { 
      flex: 1, 
      justifyContent: "center", 
      alignItems: "center",
      backgroundColor: theme.background || "#f5f7fa",
    },
    loadingText: { 
      marginTop: 16, 
      color: theme.textSecondary || "#666", 
      fontSize: 14,
      fontWeight: "600",
    },
    scrollContainer: { 
      flex: 1,
      backgroundColor: theme.background || "#f5f7fa",
    },
    scrollContent: {
      padding: 16,
    },
    card: {
      backgroundColor: theme.cardBackground || "#fff",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.borderColor || "#f0f0f0",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    busBadge: {
      width: 56,
      height: 40,
      backgroundColor: theme.secondaryBackground || "#FFF3E0",
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 2,
      borderColor: theme.primary || "#FFB300",
    },
    busNumber: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.primaryDark || "#F57C00",
    },
    timeContainer: {
      width: 60,
      marginRight: 12,
      justifyContent: "center",
    },
    time: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.textPrimary || "#1a1a1a",
      letterSpacing: 0.5,
    },
    routeSection: {
      flex: 1,
      justifyContent: "center",
    },
    location: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.textPrimary || "#333",
      lineHeight: 20,
    },
    arrowContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 6,
    },
    arrowLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.primary || "#D4A53A",
      marginRight: 8,
      opacity: 0.6,
    },
    arrowIcon: {
      fontSize: 16,
      color: theme.primary || "#D4A53A",
      fontWeight: "bold",
    },
    expandedSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 2,
      borderTopColor: theme.borderColor || "#f0f0f0",
    },
    routeLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.textSecondary || "#666",
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    chipsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 4,
    },
    chip: {
      backgroundColor: theme.successBackground || "#E8F5E9",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.successBorder || "#C8E6C9",
    },
    chipText: {
      fontSize: 12,
      color: theme.successText || "#2E7D32",
      fontWeight: "600",
    },
    footer: {
      marginTop: 14,
      alignItems: "center",
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.borderColor || "#f0f0f0",
    },
    footerText: {
      fontSize: 12,
      color: theme.textSecondary || "#999",
      fontWeight: "600",
      fontStyle: "italic",
    },
  });
};

export default BusTimetable;