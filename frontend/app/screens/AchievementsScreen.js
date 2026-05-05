import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import apiClient from "../../api/client";

const AchievementsScreen = ({ route }) => {
console.log(new Date());
  const { userId } = route.params || {};
  const [badges, setBadges] = useState([]);

  useEffect(() => {

    const fetchBadges = async () => {

      try {
        const data = await apiClient(`health/risk-assessment?userId=${userId}`);
        setBadges(data.badgesCalendar || []);
      }
      catch (e) {
        console.log(e);
      }

    };

    fetchBadges();

  }, []);

  // ✅ NEW REAL CALENDAR LOGIC (replaces fake 1–30 loop)
  const renderDays = () => {

    const days = [];

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1).getDay(); // start position
    const totalDays = new Date(year, month + 1, 0).getDate(); // days in month

    // 🔹 Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={"empty-" + i} style={styles.day} />
      );
    }

    // 🔹 Actual days
    for (let i = 1; i <= totalDays; i++) {

      const badgeDay = badges.find(b => {
        const d = new Date(b.date);
        return (
          d.getDate() === i &&
          d.getMonth() === month &&
          d.getFullYear() === year
        );
      });

      days.push(
        <View
          key={i}
          style={[
            styles.day,
            badgeDay ? styles.badgeDay : styles.normalDay
          ]}
        >
          <Text style={styles.dayText}>{i}</Text>
        </View>
      );
    }

    return days;
  };

  // ✅ Dynamic Month Title
  const today = new Date();
  const monthName = today.toLocaleString("default", { month: "long" });
  const year = today.getFullYear();

  return (

    <View style={styles.container}>

      {/* ✅ Updated Title */}
      <Text style={styles.title}>🔥 NEW UI LOADED 🔥</Text>

      <Text style={styles.subtitle}>
        Green days mean your nutrition was balanced.
      </Text>

      <View style={styles.calendar}>
        {renderDays()}
      </View>

    </View>

  );

};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F9FCF9"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10
  },

  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 20
  },

  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },

  day: {
    width: 30,   // 🔥 slightly bigger for visibility
    height: 30,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center"
  },

  normalDay: {
    backgroundColor: "#E0E0E0"
  },

  badgeDay: {
    backgroundColor: "#4CAF50"
  },

  // ✅ NEW (for numbers inside box)
  dayText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#000"
  }

});

export default AchievementsScreen;