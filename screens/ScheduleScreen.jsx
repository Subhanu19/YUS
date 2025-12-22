import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  FlatList,
  Platform,
  Easing,
  Dimensions,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import WebSocketService from "../services/WebSocketService";
import { useTheme } from "../context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";


const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const SCREEN_HEIGHT = Dimensions.get('window').height;

// ====== Constants ======
const ITEM_HEIGHT = 120;
const DISTANCE_THRESHOLD_METERS = 1000;
const BUS_ICON_TOP_OFFSET = 16;
const YELLOW_PROGRESS_COLOR = "#FFD700";

// ====== SIMPLIFIED Math - Working Version ======

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return NaN;
  
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * SIMPLE VERSION: Calculate progress using distance ratio
 */
function calculateSegmentProgress(busLat, busLon, startStop, endStop) {
  const startLat = parseFloat(startStop.lat);
  const startLon = parseFloat(startStop.lon);
  const endLat = parseFloat(endStop.lat);
  const endLon = parseFloat(endStop.lon);

  if (Number.isNaN(startLat) || Number.isNaN(startLon) || 
      Number.isNaN(endLat) || Number.isNaN(endLon)) {
    return 0;
  }

  const distanceToStart = getDistance(busLat, busLon, startLat, startLon);
  const distanceToEnd = getDistance(busLat, busLon, endLat, endLon);
  const segmentLength = getDistance(startLat, startLon, endLat, endLon);

  if (segmentLength === 0 || Number.isNaN(distanceToStart) || Number.isNaN(distanceToEnd)) {
    return 0;
  }

  // Simple ratio formula
  let progress = 0;
  if (distanceToStart + distanceToEnd > 0) {
    progress = 1 - (distanceToEnd / (distanceToStart + distanceToEnd));
  }

  // Clamp between 0 and 1
  progress = Math.max(0, Math.min(1, progress));
  
  // Smooth near stops
  if (distanceToStart < 50) return Math.max(0.05, progress);
  if (distanceToEnd < 50) return Math.min(0.95, progress);
  
  return progress;
}

// ✅ FIX #1 & #2: Updated findCurrentSegment with SAFE fallback
/**
 * IMPROVED VERSION: Find current segment with state-preserving fallback
 */
function findCurrentSegment(busLat, busLon, stops, lastConfirmedStopIndex, prevSegment) {
  if (!stops || stops.length < 2) {
    return { segmentIndex: 0, progress: 0 };
  }

  let bestSegment = { index: 0, progress: 0 };
  let bestDistance = Infinity;

  // Search from current segment forward
  const startIdx = Math.max(0, Math.min(lastConfirmedStopIndex, stops.length - 2));
  
  for (let i = startIdx; i < stops.length - 1; i++) {
    const startStop = stops[i];
    const endStop = stops[i + 1];
    
    if (!startStop?.lat || !startStop?.lon || !endStop?.lat || !endStop?.lon) {
      continue;
    }

    const startLat = parseFloat(startStop.lat);
    const startLon = parseFloat(startStop.lon);
    const endLat = parseFloat(endStop.lat);
    const endLon = parseFloat(endStop.lon);
    
    if (Number.isNaN(startLat) || Number.isNaN(startLon) || 
        Number.isNaN(endLat) || Number.isNaN(endLon)) {
      continue;
    }

    // Check if bus is between these two stops
    const distanceToStart = getDistance(busLat, busLon, startLat, startLon);
    const distanceToEnd = getDistance(busLat, busLon, endLat, endLon);
    
    // If bus is closer to this segment than previous best, use it
    const minDist = Math.min(distanceToStart, distanceToEnd);
    if (minDist < bestDistance) {
      bestDistance = minDist;
      
      // Calculate progress
      const progress = calculateSegmentProgress(
        busLat, busLon, 
        { lat: startLat, lon: startLon }, 
        { lat: endLat, lon: endLon }
      );
      
      bestSegment = {
        index: i,
        progress: progress
      };
    }
  }

  // ✅ FIX #1 & #2: SAFE fallback using previous segment state
  if (!Number.isFinite(bestDistance)) {
    return {
      segmentIndex: prevSegment?.index ?? startIdx,
      progress: prevSegment?.progress ?? 0.5
    };
  }

  return bestSegment;
}

// ====== Component ======
export default function ScheduleScreen() {
  const route = useRoute();
  const { theme } = useTheme();
  const { busObject } = route.params || {};

  const styles = createStyles(theme);

  const [busData, setBusData] = useState(busObject || { stops: [] });
  const [loading, setLoading] = useState(!busObject?.stops?.length);
  const [currentSegment, setCurrentSegment] = useState({ index: 0, progress: 0 });
  const [lastConfirmedStopIndex, setLastConfirmedStopIndex] = useState(0);
  const [location, setLocation] = useState(null);
  const [etas, setEtas] = useState({});
  const [etaCalculated, setEtaCalculated] = useState(false);
  const [reachedStops, setReachedStops] = useState({});
  const [nextStopDistance, setNextStopDistance] = useState(null);

  const translateY = useRef(new Animated.Value(BUS_ICON_TOP_OFFSET)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const prevSegmentRef = useRef({ index: 0, progress: 0 });

  useFocusEffect(
  React.useCallback(() => {
    // Screen is focused → do nothing
    return () => {
      // Screen is unfocused (going back)
      const payload = {
        driver_id: 1000,
        route_id: 0,
        direction: "up",
      };

      WebSocketService.send(payload);
      console.log("📤 Sent on ScheduleScreen exit:", payload);
    };
  }, [])
);


  // Yellow progress line animation values
  const [lineProgress, setLineProgress] = useState(
    () => (busData.stops?.map(() => new Animated.Value(0)) || [])
  );

  useEffect(() => {
    setLineProgress(busData.stops?.map(() => new Animated.Value(0)) || []);
  }, [busData.stops?.length]);

  const isUpRoute = (busData?.direction || "").toUpperCase() === "UP";

  // ====== YELLOW PROGRESS LINE FUNCTIONS ======
  
  const updateYellowProgressLine = useCallback((segmentIndex, segmentProgress) => {
    lineProgress.forEach((anim, index) => {
      let targetValue = 0;
      
      if (index < segmentIndex) {
        // Past segments - fully yellow
        targetValue = 1;
      } else if (index === segmentIndex) {
        // Current segment - partial yellow based on bus position
        targetValue = segmentProgress;
      }
      // Future segments remain 0 (not yellow)
      
      // Animate to the target value
      if (Math.abs(anim.__getValue() - targetValue) > 0.01) {
        Animated.timing(anim, {
          toValue: targetValue,
          duration: 300,
          useNativeDriver: false,
          easing: Easing.out(Easing.quad),
        }).start();
      }
    });
  }, [lineProgress]);

  // ====== WebSocket Handler ======
  useEffect(() => {
    const unsubscribe = WebSocketService.subscribe((data) => {
      if (!data) return;

      // Extract GPS data
      const latitude = data.latitude ?? data.lat ?? data.lattitude ?? data.lattude;
      const longitude = data.longitude ?? data.lon ?? data.long ?? data.longitude;
      const speedStr = data.speed ?? data.speedInMeters ?? data.speed_meters ?? "0";

      if (latitude == null || longitude == null) return;

      const currentLat = parseFloat(latitude);
      const currentLon = parseFloat(longitude);
      const currentSpeed = Number(speedStr) || 0;

      setLocation({ lat: currentLat, lon: currentLon, speed: currentSpeed });

      const stops = busData.stops || [];
      
      // === STEP 1: BUS MOVEMENT ===
      if (stops.length > 1) {
        const prev = prevSegmentRef.current;
        
        // ✅ Pass previous segment to findCurrentSegment for fallback
        const segmentInfo = findCurrentSegment(
          currentLat, 
          currentLon, 
          stops, 
          lastConfirmedStopIndex,
          prev
        );
        
        // ✅ FIX #3: Improved segmentChanged logic (0.01 threshold)
        const segmentChanged = 
          prev.index !== segmentInfo.index || 
          Math.abs(prev.progress - segmentInfo.progress) > 0.01;
        
        if (segmentChanged) {
          setCurrentSegment(segmentInfo);
          prevSegmentRef.current = segmentInfo;
          
          // Calculate bus position
          const busY = (segmentInfo.index + segmentInfo.progress) * ITEM_HEIGHT + BUS_ICON_TOP_OFFSET;
          
          // 1. Animate bus movement
          Animated.timing(translateY, {
            toValue: busY,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }).start();
          
          // 2. Update YELLOW progress line
          updateYellowProgressLine(segmentInfo.index, segmentInfo.progress);
          
          // Auto-scroll
          const targetScrollIndex = Math.max(0, segmentInfo.index - 1);
          if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
              offset: targetScrollIndex * ITEM_HEIGHT,
              animated: true,
            });
          }
        }
      }

      // === STEP 2: DISTANCE TO NEXT STOP ===
      if (stops.length > 0) {
        const nextStopIdx = Math.min(lastConfirmedStopIndex + 1, stops.length - 1);
        const nextStop = stops[nextStopIdx];
        
        if (nextStop?.lat && nextStop?.lon) {
          const nextStopLat = parseFloat(nextStop.lat);
          const nextStopLon = parseFloat(nextStop.lon);
          
          if (!Number.isNaN(nextStopLat) && !Number.isNaN(nextStopLon)) {
            const distance = getDistance(currentLat, currentLon, nextStopLat, nextStopLon);
            if (!Number.isNaN(distance)) {
              setNextStopDistance(distance);
            }
          }
        }
      }

      // === STEP 3: ARRIVAL STATUS ===
      const arrivalStatus = data.arrival_status ?? data.arrivalStatus ?? {};

      if (arrivalStatus && typeof arrivalStatus === "object" && Object.keys(arrivalStatus).length > 0) {
        const calc = calculateETAsFromArrivalStatus(arrivalStatus);
        if (calc) {
          setEtas(calc.etas);
          setEtaCalculated(true);
          
          if (calc.latestIndex > lastConfirmedStopIndex) {
            setLastConfirmedStopIndex(calc.latestIndex);
            updateReachedStops(calc.latestIndex);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [
    busData.stops, 
    translateY, 
    lastConfirmedStopIndex,
    lineProgress,
    updateYellowProgressLine
  ]);

  // ====== Render Stop Item with YELLOW PROGRESS ======
  const renderStop = ({ item, index }) => {
    const displayStopIndex = Math.max(lastConfirmedStopIndex, currentSegment.index);
    const isActive = index === displayStopIndex;
    const isCompleted = index < lastConfirmedStopIndex;

    const eta = etas[index] || "--:--";
    const formattedArrival = formatStaticTime(item.arrival_time, isUpRoute);
    const formattedDeparture = formatStaticTime(item.departure_time, isUpRoute);
    const statusColor = getStatusColor(eta, formattedArrival);
    const delayText = getDelayText(eta, formattedArrival);

    const yellowProgress = lineProgress[index] ?? new Animated.Value(0);

    return (
      <View style={styles.stopContainer}>
        <View style={styles.timeline}>
          {/* BACKGROUND LINE (GRAY) */}
          <View style={[styles.fullLine, { backgroundColor: theme.border }]} />
          
          {/* YELLOW PROGRESS LINE - Fills as bus moves */}
          <Animated.View
            style={[
              styles.progressLine,
              {
                height: yellowProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, ITEM_HEIGHT],
                }),
                backgroundColor: YELLOW_PROGRESS_COLOR,
              },
            ]}
          />
          
          <View
            style={[
              styles.circle,
              {
                backgroundColor: isActive ? theme.GOLD_START : isCompleted ? theme.accent : theme.border,
              },
            ]}
          />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.etaSection}>
            <Text style={[styles.etaText, { color: statusColor }]}>{eta}</Text>
            {delayText ? <Text style={[styles.delayText, { color: statusColor }]}>{delayText}</Text> : null}
          </View>

          <View style={[styles.stopDetails, { borderBottomColor: theme.border }]}>
            <View style={styles.stopHeader}>
              <Text style={[styles.stopName, { color: isActive ? theme.GOLD_START : isCompleted ? theme.accent : theme.textDark }]}>
                {item.location_name}
              </Text>
              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: theme.GOLD_START }]}>
                  <Text style={styles.activeBadgeText}>CURRENT</Text>
                </View>
              )}
              {isCompleted && (
                <View style={[styles.reachedBadge, { backgroundColor: "#2b8a3e" }]}>
                  <Text style={styles.reachedBadgeText}>REACHED</Text>
                </View>
              )}
            </View>

            <View style={styles.scheduleSection}>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: theme.textLight }]}>Arrival:</Text>
                <Text style={[styles.time, { color: theme.textDark }]}>{formattedArrival}</Text>
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: theme.textLight }]}>Departure:</Text>
                <Text style={[styles.time, { color: theme.textDark }]}>{formattedDeparture}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ====== Helper Functions ======
  const getStatusColor = (eta, scheduledTime) => {
    if (!eta || eta === "--:--" || !scheduledTime) return theme.textLight;
    const etaMins = parseTimeToMinutes(eta) ?? 0;
    const schedMins = parseTimeToMinutes(scheduledTime) ?? 0;
    if (!etaMins || !schedMins) return theme.textLight;
    const diff = etaMins - schedMins;
    if (Math.abs(diff) < 2) return "#2b8a3e";
    return diff > 0 ? "#d62828" : "#098596ff";
  };

  const getDelayText = (eta, scheduledTime) => {
    if (!eta || eta === "--:--" || !scheduledTime) return "";
    const etaMins = parseTimeToMinutes(eta) ?? 0;
    const schedMins = parseTimeToMinutes(scheduledTime) ?? 0;
    const diff = etaMins - schedMins;
    if (Math.abs(diff) < 2) return "On time";
    return diff > 0 ? `+${diff} min late` : `${Math.abs(diff)} min early`;
  };

  const calculateETAsFromArrivalStatus = useCallback((arrivalStatusMap) => {
    if (!arrivalStatusMap || Object.keys(arrivalStatusMap).length === 0) return null;
    const stops = busData.stops || [];
    if (!stops.length) return null;
    
    const keys = Object.keys(arrivalStatusMap).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
    if (!keys.length) return null;
    const latestSeq = Math.max(...keys);
    const latestIndex = latestSeq - 1;
    if (latestIndex < 0 || latestIndex >= stops.length) return null;
    
    const latestReportedTimeStr = arrivalStatusMap[String(latestSeq)];
    const latestReportedMins = parseTimeToMinutes(latestReportedTimeStr);
    if (latestReportedMins == null) return null;
    
    const newEtas = {};
    for (let i = 0; i <= latestIndex; i++) {
      const seq = i + 1;
      if (arrivalStatusMap[String(seq)]) {
        newEtas[i] = to12HourFormat(arrivalStatusMap[String(seq)]);
      } else {
        newEtas[i] = formatStaticTime(stops[i].arrival_time, isUpRoute);
      }
    }
    
    const latestScheduledMins = parseTimeToMinutes(
      formatStaticTime(
        stops[latestIndex].arrival_time || stops[latestIndex].departure_time || "--:--",
        isUpRoute
      )
    );
    
    for (let j = latestIndex + 1; j < stops.length; j++) {
      const scheduledMinsJ = parseTimeToMinutes(
        formatStaticTime(stops[j].arrival_time || stops[j].departure_time || "--:--", isUpRoute)
      );
      if (scheduledMinsJ == null || latestScheduledMins == null) {
        newEtas[j] = "--:--";
        continue;
      }
      const diff = scheduledMinsJ - latestScheduledMins;
      const etaMins = latestReportedMins + diff;
      newEtas[j] = minutesToDisplay(etaMins);
    }
    
    return { etas: newEtas, latestIndex };
  }, [busData.stops, isUpRoute]);

  const updateReachedStops = useCallback((latestIndex) => {
    setReachedStops(prev => {
      const next = { ...prev };
      for (let i = 0; i <= latestIndex; i++) {
        next[i] = true;
      }
      return next;
    });
  }, []);

  // ====== Footer with Distance ======
  const computeNextStopInfo = () => {
    const stops = busData.stops || [];
    if (!stops.length) return { name: "N/A", distText: "" };

    const nextStopIdx = Math.min(lastConfirmedStopIndex + 1, stops.length - 1);
    const nextStop = stops[nextStopIdx];
    if (!nextStop) return { name: "N/A", distText: "" };

    let distText = "";
    if (nextStopDistance != null && !Number.isNaN(nextStopDistance)) {
      distText = formatDistance(nextStopDistance);
    }

    return { 
      name: nextStop.location_name || "N/A", 
      distText: distText 
    };
  };

  // ====== Format Functions ======
  const to12HourFormat = (timeStr) => {
    if (!timeStr || timeStr === "--:--") return "--:--";
    if (typeof timeStr === "string" && (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM"))) {
      return timeStr;
    }
    const parts = String(timeStr).split(":");
    if (parts.length < 2) return "--:--";
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return "--:--";
    const period = hours >= 12 ? "PM" : "AM";
    const twelveHour = hours % 12 || 12;
    return `${twelveHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === "--:--") return null;
    const s = String(timeStr).trim();
    const ampmMatch = s.match(/(AM|PM)$/i);
    if (ampmMatch) {
      const clean = s.replace(/\s*(AM|PM)$/i, "");
      const [hStr, mStr] = clean.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      let hours = h % 12;
      if (s.toUpperCase().includes("PM")) hours += 12;
      return hours * 60 + m;
    } else {
      const [hStr, mStr] = s.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return (h % 24) * 60 + m;
    }
  };

  const minutesToHHMM = (mins) => {
    if (mins == null) return "--:--";
    const normalized = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const minutesToDisplay = (mins) => to12HourFormat(minutesToHHMM(mins));

  const formatDistance = (meters) => {
    if (meters == null || Number.isNaN(meters)) return "";
    if (meters >= DISTANCE_THRESHOLD_METERS) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatStaticTime = (timeStr, isUpRoute) => {
    if (!timeStr) return "--:--";
    if (typeof timeStr === "string" && (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM"))) {
      return timeStr;
    }
    const [hours, minutes] = String(timeStr).split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return "--:--";
    if (isUpRoute) {
      const twelveHour = hours % 12 || 12;
      return `${twelveHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} AM`;
    } else {
      const period = hours >= 12 ? "PM" : "AM";
      const twelveHour = hours % 12 || 12;
      return `${twelveHour.toString().padStart(2, "00")}:${minutes.toString().padStart(2, "0")} ${period}`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.GOLD_START} />
        <Text style={[styles.loadingText, { color: theme.textDark }]}>Loading bus schedule...</Text>
      </View>
    );
  }

  const nextInfo = computeNextStopInfo();

  return (
    <View style={styles.container}>
      <View style={[styles.headerSection, { backgroundColor: theme.GOLD_START }]}>
        <Text style={styles.title}>{busData.route_name}</Text>
        <Text style={styles.subtitle}>
          Bus {busData.bus_id} - {isUpRoute ? "UP Route (Morning)" : "DOWN Route (Evening)"} - Live Tracking
        </Text>
      </View>

      <View style={styles.scheduleContainer}>
        <AnimatedFlatList
          ref={flatListRef}
          data={busData.stops}
          renderItem={renderStop}
          keyExtractor={(item, index) => `${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />

        {/* Bus Icon */}
        <View style={styles.busLayer}>
          <Animated.View 
            style={[
              styles.busMovingContainer, 
              { 
                transform: [
                  { translateY: Animated.subtract(translateY, scrollY) }
                ],
                opacity: location ? 1 : 0.7,
              }
            ]}
          >
            <View style={[styles.busIconContainer, { backgroundColor: theme.GOLD_START }]}>
              <Text style={styles.busEmoji}>🚍</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.secondary }]}>
        <Text style={[styles.locationTitle, { color: theme.textDark }]}>
          Current Location:
        </Text>
        <Text style={[styles.locationText, { color: theme.textLight }]}>
          {location
            ? `Lat: ${location.lat?.toFixed(6) || "N/A"}, Lon: ${location.lon?.toFixed(6) || "N/A"}`
            : "Waiting for GPS updates..."}
        </Text>

        <Text style={[styles.connectionStatus, { color: theme.textLight }]}>
          Next stop:{" "}
          <Text style={{ fontWeight: "700", color: theme.textLight }}>
            {nextInfo.name}
          </Text>
          {nextInfo.distText ? ` • ${nextInfo.distText}` : ""}
        </Text>
      </View>
    </View>
  );
}

// ===== Styles =====
const createStyles = (theme) =>
  StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.background 
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    loadingText: { 
      marginTop: 16, 
      fontSize: 16, 
      fontWeight: "500" 
    },
    headerSection: {
      padding: 50,
      zIndex: 100,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.GOLD_START,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.BLACK,
      marginBottom: 4,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: theme.BLACK,
      marginBottom: 16,
      textAlign: "center",
      fontWeight: "500",
      opacity: 0.9,
    },
    scheduleContainer: { 
      flex: 1, 
      position: "relative",
      backgroundColor: theme.background,
    },
    listContent: { 
      padding: 16, 
      paddingBottom: 100 
    },
    stopContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      height: ITEM_HEIGHT,
    },
    timeline: { 
      width: 40, 
      alignItems: "center", 
      justifyContent: "flex-start",
      position: 'relative',
    },
    fullLine: {
      position: "absolute",
      top: 8,
      width: 2,
      height: "100%",
      backgroundColor: theme.border,
    },
    progressLine: {
      position: "absolute",
      top: 8,
      width: 2,
      backgroundColor: "#FFD700",
      zIndex: 2,
    },
    circle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginVertical: 5,
      zIndex: 3,
    },
    contentContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    etaSection: {
      width: 80,
      alignItems: "flex-start",
      paddingRight: 12,
    },
    etaText: {
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 4,
    },
    delayText: {
      fontSize: 11,
      fontWeight: "500",
    },
    stopDetails: {
      flex: 1,
      justifyContent: "center",
      borderBottomWidth: 1,
      paddingBottom: 16,
    },
    stopHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    stopName: {
      fontSize: 16,
      fontWeight: "700",
      flex: 1,
    },
    activeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    activeBadgeText: {
      color: theme.secondary,
      fontSize: 10,
      fontWeight: "800",
    },
    reachedBadge: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    reachedBadgeText: {
      color: theme.secondary,
      fontWeight: "700",
      fontSize: 11,
    },
    scheduleSection: {},
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    timeLabel: {
      fontSize: 13,
      fontWeight: "500",
      width: 70,
    },
    time: {
      fontSize: 14,
      fontWeight: "600",
    },
    busIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 5,
    },
    busEmoji: { 
      fontSize: 16 
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
    },
    locationTitle: {
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 4,
    },
    locationText: {
      fontSize: 12,
      marginBottom: 8,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    connectionStatus: {
      fontSize: 12,
      fontWeight: "500",
    },
    busLayer: {
      position: "absolute",
      top: 0,
      left: 20,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
    },
    busMovingContainer: {
      position: "absolute",
      left: 0,
      top: 0,
      zIndex: 10,
    },
  });