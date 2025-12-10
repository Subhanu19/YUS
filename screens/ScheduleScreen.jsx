import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import webSocketService from "../services/WebSocketService";
import { useTheme } from "../context/ThemeContext";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// ====== Constants ======
const ITEM_HEIGHT = 120;
const DISTANCE_THRESHOLD_METERS = 1000; // above this show km else meters
const STOP_REACHED_THRESHOLD_METERS = 50; // 50 meters threshold for "reached"

// ====== Helpers ======

// Haversine formula for distance (meters)
function getDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  )
    return NaN;

  const R = 6371e3; // Earth radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // meters
}

// Format 24h "HH:MM" to 12-hour with AM/PM (if needed)
const to12HourFormat = (timeStr) => {
  if (!timeStr || timeStr === "--:--") return "--:--";

  if (
    typeof timeStr === "string" &&
    (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM"))
  ) {
    return timeStr;
  }

  const parts = String(timeStr).split(":");
  if (parts.length < 2) return "--:--";
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "--:--";

  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  return `${twelveHour.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")} ${period}`;
};

// Convert times to minutes since midnight.
// Accepts "HH:MM" (24-hour) or "hh:mm AM/PM".
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

// Convert minutes since midnight back to HH:MM (24h)
const minutesToHHMM = (mins) => {
  if (mins == null) return "--:--";
  const normalized = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// Convert minutes -> nicely formatted ETA (12h)
const minutesToDisplay = (mins) => {
  return to12HourFormat(minutesToHHMM(mins));
};

// Format distance for display (meters or km)
const formatDistance = (meters) => {
  if (meters == null || Number.isNaN(meters)) return "";
  if (meters >= DISTANCE_THRESHOLD_METERS) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

// Convert scheduled static time for display (keeps your logic)
const formatStaticTime = (timeStr, isUpRoute) => {
  if (!timeStr) return "--:--";

  if (
    typeof timeStr === "string" &&
    (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM"))
  ) {
    return timeStr;
  }

  const [hours, minutes] = String(timeStr).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "--:--";

  if (isUpRoute) {
    const twelveHour = hours % 12 || 12;
    return `${twelveHour.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")} AM`;
  } else {
    const period = hours >= 12 ? "PM" : "AM";
    const twelveHour = hours % 12 || 12;
    return `${twelveHour.toString().padStart(2, "00")}:${minutes
      .toString()
      .padStart(2, "0")} ${period}`;
  }
};

// ====== Component ======
export default function ScheduleScreen() {
  const route = useRoute();
  const { theme } = useTheme();
  const { busObject } = route.params || {};

  const styles = createStyles(theme);

  const [busData, setBusData] = useState(busObject || { stops: [] });
  const [loading, setLoading] = useState(!busObject?.stops?.length);
  const [currentStopIndex, setCurrentStopIndex] = useState(0); // 0-based
  const [location, setLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [etas, setEtas] = useState({}); // { stopIndex(0-based): ETA string }
  const [etaCalculated, setEtaCalculated] = useState(false);
  const [reachedStops, setReachedStops] = useState({}); // { index: true }

  const translateY = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // animated line progress array — rebuild when stops change
  const [lineProgress, setLineProgress] = useState(
    () => (busData.stops?.map(() => new Animated.Value(0)) || [])
  );

  useEffect(() => {
    // rebuild line progress animated values if stops changed length
    setLineProgress(busData.stops?.map(() => new Animated.Value(0)) || []);
  }, [busData.stops?.length]);

  // route direction
  const isUpRoute = (busData?.direction || "").toUpperCase() === "UP";

  // helper: status color & delay
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

  // Calculate ETAs from arrival_status map (preferred)
  const calculateETAsFromArrivalStatus = (arrivalStatusMap) => {
    if (!arrivalStatusMap || Object.keys(arrivalStatusMap).length === 0) return null;

    const stops = busData.stops || [];
    if (!stops.length) return null;

    const keys = Object.keys(arrivalStatusMap)
      .map((k) => Number(k))
      .filter((n) => !Number.isNaN(n));
    if (!keys.length) return null;
    const latestSeq = Math.max(...keys); // 1-based
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
  };

  // Fallback ETA calculation (one-time) using schedule shift
  const calculateETAsFallback = (currentLat, currentLon, currentSpeed) => {
    if (!busData.stops || !currentLat || !currentLon || etaCalculated) return null;

    const newEtas = {};
    const busStartTime = busData.stops[0]?.departure_time;
    if (!busStartTime) return null;

    const busStartMinutes = parseTimeToMinutes(formatStaticTime(busStartTime, isUpRoute));
    if (busStartMinutes == null) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const timeDifference = currentMinutes - busStartMinutes;

    busData.stops.forEach((stop, index) => {
      if (index === 0) {
        newEtas[index] = minutesToDisplay(currentMinutes);
      } else {
        const scheduledArrival = stop.arrival_time;
        if (!scheduledArrival) {
          newEtas[index] = "--:--";
          return;
        }
        const scheduledMinutes = parseTimeToMinutes(formatStaticTime(scheduledArrival, isUpRoute));
        if (scheduledMinutes == null) {
          newEtas[index] = "--:--";
          return;
        }
        const etaMinutes = scheduledMinutes + timeDifference;
        newEtas[index] = minutesToDisplay(etaMinutes);
      }
    });

    return newEtas;
  };

  // ===== Utility: mark stop reached & animate =====
  const markStopReached = (index, currentLat, currentLon) => {
    setReachedStops((prev) => {
      if (prev[index]) return prev;
      const next = { ...prev, [index]: true };
      return next;
    });

    // set current stop index and animate
    setCurrentStopIndex((prev) => {
      if (index === prev) return prev;
      const next = index;
      // animate bus to the reached stop
      const busY = next * ITEM_HEIGHT;
      Animated.spring(translateY, {
        toValue: busY,
        useNativeDriver: true,
        damping: 12,
        stiffness: 90,
      }).start();

      // update lineProgress: all previous full; current small progress maybe based on distance
      lineProgress.forEach((lineAnim, i) => {
        if (i < next) {
          lineAnim.setValue(1);
        } else if (i === next) {
          // set small progress based on distance to next if available
          if (busData.stops && busData.stops[i + 1]) {
            const totalDist = getDistance(
              parseFloat(busData.stops[i].lat),
              parseFloat(busData.stops[i].lon),
              parseFloat(busData.stops[i + 1].lat),
              parseFloat(busData.stops[i + 1].lon)
            );
            const distFromCurrent = getDistance(
              currentLat,
              currentLon,
              parseFloat(busData.stops[i].lat),
              parseFloat(busData.stops[i].lon)
            );
            let progress = 0;
            if (totalDist > 0 && !Number.isNaN(distFromCurrent)) {
              progress = Math.max(0, Math.min(1, distFromCurrent / totalDist));
            }
            Animated.timing(lineAnim, {
              toValue: progress,
              duration: 200,
              useNativeDriver: false,
            }).start();
          } else {
            lineAnim.setValue(0);
          }
        } else {
          lineAnim.setValue(0);
        }
      });

      // auto-scroll FlatList to keep reached stop visible
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: Math.max(0, next * ITEM_HEIGHT - ITEM_HEIGHT),
          animated: true,
        });
      }

      return next;
    });
  };

  // ===== WebSocket updates =====
  useEffect(() => {
    // connect (webSocketService.connect should be idempotent)
    webSocketService.connect();
    setConnectionStatus("connected");

    const unsubscribe = webSocketService.subscribe((data) => {
      if (!data) return;

      // normalize driver-provided keys
      const latitude = data.latitude ?? data.lat ?? data.lattitude ?? data.lattude;
      const longitude = data.longitude ?? data.lon ?? data.long ?? data.longitude;
      const speedStr = data.speed ?? data.speedInMeters ?? data.speed_meters ?? "0";

      if (latitude == null || longitude == null) return;

      const currentLat = parseFloat(latitude);
      const currentLon = parseFloat(longitude);
      const currentSpeed = Number(speedStr) || 0;

      setLocation({ lat: currentLat, lon: currentLon, speed: currentSpeed });

      // --- STOP REACHED THRESHOLD CHECK (distance-in-meters) ---
      if (busData.stops && Array.isArray(busData.stops)) {
        busData.stops.forEach((stop, idx) => {
          try {
            const stopLat = parseFloat(stop.lat ?? stop.latitude ?? stop.latitude_str ?? stop.lat_str);
            const stopLon = parseFloat(stop.lon ?? stop.longitude ?? stop.longitude_str ?? stop.lon_str);
            if (Number.isNaN(stopLat) || Number.isNaN(stopLon)) return;

            // compute meters using haversine
            const distMeters = getDistance(currentLat, currentLon, stopLat, stopLon);

            if (!Number.isNaN(distMeters) && distMeters <= STOP_REACHED_THRESHOLD_METERS) {
              // Mark reached (only once)
              if (!reachedStops[idx]) {
                markStopReached(idx, currentLat, currentLon);
              }
            }
          } catch (e) {
            // ignore parse errors for a stop
          }
        });
      }

      // If server sends arrival_status (map), use it to compute ETAs and current stop
      const arrivalStatus = data.arrival_status ?? data.arrivalStatus ?? {};

      if (arrivalStatus && typeof arrivalStatus === "object" && Object.keys(arrivalStatus).length > 0) {
        const calc = calculateETAsFromArrivalStatus(arrivalStatus);
        if (calc) {
          setEtas(calc.etas);
          setEtaCalculated(true);

          const latestIndex = calc.latestIndex;
          setCurrentStopIndex(latestIndex);

          // move bus to the reported stop
          const busY = latestIndex * ITEM_HEIGHT;
          Animated.spring(translateY, {
            toValue: busY,
            useNativeDriver: true,
            damping: 12,
            stiffness: 90,
          }).start();

          // update progress lines
          lineProgress.forEach((lineAnim, i) => {
            if (i < latestIndex) {
              lineAnim.setValue(1);
            } else if (i === latestIndex) {
              if (busData.stops && busData.stops[i + 1]) {
                const totalDist = getDistance(
                  parseFloat(busData.stops[i].lat),
                  parseFloat(busData.stops[i].lon),
                  parseFloat(busData.stops[i + 1].lat),
                  parseFloat(busData.stops[i + 1].lon)
                );
                const distFromCurrent = getDistance(
                  currentLat,
                  currentLon,
                  parseFloat(busData.stops[i].lat),
                  parseFloat(busData.stops[i].lon)
                );
                let progress = 0;
                if (totalDist > 0 && !Number.isNaN(distFromCurrent)) {
                  progress = Math.max(0, Math.min(1, distFromCurrent / totalDist));
                }
                Animated.timing(lineAnim, {
                  toValue: progress,
                  duration: 200,
                  useNativeDriver: false,
                }).start();
              } else {
                lineAnim.setValue(0);
              }
            } else {
              lineAnim.setValue(0);
            }
          });
        }
      } else {
        // fallback method once
        if (!etaCalculated) {
          const fallback = calculateETAsFallback(currentLat, currentLon, currentSpeed);
          if (fallback) {
            setEtas(fallback);
            setEtaCalculated(true);
          }
        }

        // position-based animation progress
        const stops = busData.stops || [];
        if (stops && stops.length && currentStopIndex < stops.length - 1) {
          const currentStop = stops[currentStopIndex];
          const nextStop = stops[currentStopIndex + 1];
          if (currentStop && nextStop && currentStop.lat && nextStop.lat) {
            const totalDist = getDistance(
              parseFloat(currentStop.lat),
              parseFloat(currentStop.lon),
              parseFloat(nextStop.lat),
              parseFloat(nextStop.lon)
            );
            const distFromCurrent = getDistance(
              currentLat,
              currentLon,
              parseFloat(currentStop.lat),
              parseFloat(currentStop.lon)
            );
            let progress = 0;
            if (totalDist > 0 && !Number.isNaN(distFromCurrent)) progress = Math.max(0, Math.min(1, distFromCurrent / totalDist));

            const busY = (currentStopIndex + progress) * ITEM_HEIGHT;
            Animated.spring(translateY, {
              toValue: busY,
              useNativeDriver: true,
              damping: 12,
              stiffness: 90,
            }).start();

            lineProgress.forEach((lineAnim, i) => {
              if (i === currentStopIndex) {
                Animated.timing(lineAnim, {
                  toValue: progress,
                  duration: 300,
                  useNativeDriver: false,
                }).start();
              } else if (i < currentStopIndex) {
                lineAnim.setValue(1);
              } else {
                lineAnim.setValue(0);
              }
            });

            if (progress >= 1 && currentStopIndex < stops.length - 1) {
              setCurrentStopIndex((prev) => {
                const next = Math.min(prev + 1, stops.length - 1);
                if (flatListRef.current) {
                  flatListRef.current.scrollToOffset({
                    offset: next * ITEM_HEIGHT - ITEM_HEIGHT,
                    animated: true,
                  });
                }
                return next;
              });
            }
          }
        }
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busData.stops, currentStopIndex, translateY, etaCalculated, JSON.stringify(busData.stops?.map(s => s.lat + s.lon)), reachedStops]);

  // render each stop item
  const renderStop = ({ item, index }) => {
    const isActive = index === currentStopIndex;
    const isCompleted = index < currentStopIndex;

    const eta = etas[index] || "--:--";
    const formattedArrival = formatStaticTime(item.arrival_time, isUpRoute);
    const formattedDeparture = formatStaticTime(item.departure_time, isUpRoute);
    const statusColor = getStatusColor(eta, formattedArrival);
    const delayText = getDelayText(eta, formattedArrival);

    // if lineProgress shorter than stops, guard
    const anim = lineProgress[index] ?? new Animated.Value(0);

    // show reached badge if threshold matched
    const reached = !!reachedStops[index];

    return (
      <View style={styles.stopContainer}>
        <View style={styles.timeline}>
          <View style={styles.fullLine} />
          <Animated.View
            style={[
              styles.progressLine,
              {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, ITEM_HEIGHT],
                }),
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
          {/* ETA Section - Left Side */}
          <View style={styles.etaSection}>
            <Text style={[styles.etaText, { color: statusColor }]}>{eta}</Text>
            {delayText ? <Text style={[styles.delayText, { color: statusColor }]}>{delayText}</Text> : null}
          </View>

          {/* Stop Details - Center */}
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
              {reached && (
                <View style={[styles.reachedBadge, { backgroundColor: "#2b8a3e" }]}>
                  <Text style={styles.reachedBadgeText}>REACHED</Text>
                </View>
              )}
            </View>

            {/* Static Schedule Times - Right Side */}
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

  // Footer info: next stop name + distance
  const computeNextStopInfo = () => {
    const stops = busData.stops || [];
    if (!stops.length) return { name: "N/A", distText: "" };

    let nextIndex = Math.min(currentStopIndex + 1, stops.length - 1);
    if (currentStopIndex >= stops.length - 1) nextIndex = stops.length - 1;

    const nextStop = stops[nextIndex];
    if (!nextStop) return { name: "N/A", distText: "" };
    if (!location) return { name: nextStop.location_name || "N/A", distText: "" };

    const d = getDistance(location.lat, location.lon, parseFloat(nextStop.lat), parseFloat(nextStop.lon));
    return { name: nextStop.location_name || "N/A", distText: formatDistance(d) };
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
        {/* Timeline list */}
        <AnimatedFlatList
          ref={flatListRef}
          data={busData.stops}
          renderItem={renderStop}
          keyExtractor={(item, index) => `${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        />

        {/* 🚍 Bus inside timeline */}
        <View style={styles.busLayer}>
          <Animated.View style={[styles.busMovingContainer, { transform: [{ translateY: Animated.subtract(translateY, scrollY) }] }]}>
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
            ? `Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)}`
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
      justifyContent: "flex-start" 
    },
    fullLine: {
      position: "absolute",
      top: 8,
      width: 2,
      height: "100%",
      backgroundColor: "#fff",
    },
    progressLine: {
      position: "absolute",
      top: 8,
      width: 2,
      backgroundColor: theme.accent,
    },
    circle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginVertical: 5,
      zIndex: 1,
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
    },
    busMovingContainer: {
      position: "absolute",
      left: 0,
      top: 16,
      zIndex: 10,
    },
  });