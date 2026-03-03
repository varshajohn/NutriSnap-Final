// FILE: app/components/AppTextInput.js

import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

const AppTextInput = ({ ...otherProps }) => (
  <View style={styles.container}>
    <TextInput style={styles.input} {...otherProps} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    fontSize: 16,
  },
});

export default AppTextInput;