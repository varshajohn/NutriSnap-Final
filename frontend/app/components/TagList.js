// FILE: app/components/TagList.js

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const Tag = ({ text }) => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>{text}</Text>
  </View>
);

const TagList = ({ title, data }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <FlatList
      data={data}
      renderItem={({ item }) => <Tag text={item} />}
      keyExtractor={(item) => item}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  list: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: '#e0f2f1', // Light green background
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  tagText: {
    color: '#00796b', // Darker green text
    fontWeight: '500',
  },
});

export default TagList;