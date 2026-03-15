import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import apiClient from "../../api/client";

const AchievementsScreen = ({ route }) => {

  const { userId } = route.params || {};
  const [badges,setBadges] = useState([]);

  useEffect(() => {

    const fetchBadges = async () => {

      try{
        const data = await apiClient(`health/risk-assessment?userId=${userId}`);
        setBadges(data.badgesCalendar || []);
      }
      catch(e){
        console.log(e);
      }

    };

    fetchBadges();

  },[]);

  const renderDays = () => {

    const days = [];

    for(let i=1;i<=30;i++){

      const badgeDay = badges.find(b => {

        const d = new Date(b.date).getDate();
        return d === i;

      });

      days.push(

        <View
          key={i}
          style={[
            styles.day,
            badgeDay ? styles.badgeDay : styles.normalDay
          ]}
        />

      );
    }

    return days;

  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>🏆 Health Calendar</Text>

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

container:{
flex:1,
padding:20,
backgroundColor:"#F9FCF9"
},

title:{
fontSize:24,
fontWeight:"bold",
marginBottom:10
},

subtitle:{
fontSize:12,
color:"#666",
marginBottom:20
},

calendar:{
flexDirection:"row",
flexWrap:"wrap",
gap:6
},

day:{
width:22,
height:22,
borderRadius:5
},

normalDay:{
backgroundColor:"#E0E0E0"
},

badgeDay:{
backgroundColor:"#4CAF50"
}

});

export default AchievementsScreen;