import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';

const BusTimetable = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

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
      }));
  };

  const getSampleData = () => [
    {
      source: "Sattur",
      destination: "Kcet",
      busNo: "6",
      time: "08:07",
      route: "Jack's Stop, Madurai Bus Stop, Petrol Bunk, Sattur Prc, Devi Theatre, Venkatachalapuram, Toll Ghate, Rr Nagar, After Pattambuthur, Soolakarai, Kooraikundu, Collectrate, Medical College, Way To Virudhunagar, Vvv College, Kcet"
    },
    {
      source: "America",
      destination: "Kcet",
      busNo: "113",
      time: "08:36",
      route: "Chair, Laptop Table, Washing Machine, Door, Front Ghate"
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bus Trips</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading timetable...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bus Trips</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Sticky header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.sourceCol, styles.headerText]}>Source</Text>
          <Text style={[styles.cell, styles.destCol, styles.headerText]}>Destination</Text>
          <Text style={[styles.cell, styles.busCol, styles.headerText]}>Bus</Text>
          <Text style={[styles.cell, styles.timeCol, styles.headerText]}>Time</Text>
          <Text style={[styles.cell, styles.routeCol, styles.headerText]}>Route</Text>
        </View>

        {/* Data rows */}
        {routes.map((route, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.cell, styles.sourceCol]}>{route.source}</Text>
            <Text style={[styles.cell, styles.destCol]}>{route.destination}</Text>
            <Text style={[styles.cell, styles.busCol, styles.busNumber]}>{route.busNo}</Text>
            <Text style={[styles.cell, styles.timeCol, styles.timeText]}>{route.time}</Text>
            <Text style={[styles.cell, styles.routeCol, styles.routeText]}>{route.route}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#1a1a1a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  loadingText: { marginTop: 16, color: '#666', fontSize: 14 },
  scrollContainer: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  cell: { fontSize: 13, color: '#333', paddingHorizontal: 4, flexWrap: 'wrap' },
  headerText: { color: '#fff', fontWeight: '600', textTransform: 'uppercase' },
  sourceCol: { flex: 1.2 },
  destCol: { flex: 1.3 },
  busCol: { flex: 0.8, textAlign: 'center' },
  timeCol: { flex: 1, textAlign: 'right' },
  routeCol: { flex: 5.7 },
  busNumber: { fontWeight: '700', color: '#2196F3' },
  timeText: { fontWeight: '600', color: '#34495e' },
  routeText: { color: '#555', fontSize: 12, lineHeight: 18 },
});

export default BusTimetable;
