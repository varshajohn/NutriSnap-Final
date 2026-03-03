import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert, Keyboard
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatGPT = ({ userId, route }) => {
  const [data, setData] = useState([]); 
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef();

  const apiUrl = 'https://unsubscribed-brittney-superably.ngrok-free.dev/api/chat';

  useEffect(() => {
    if (route.params?.initialMessage) {
      setTextInput(route.params.initialMessage);
      // Optional: Automatically send it by calling handleSend() 
      // but usually better to let the user see it first.
    }
  }, [route.params?.initialMessage]);
  // 1. Persistence & Keyboard Logic
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('@nutrisnap_history');
        if (savedHistory !== null) setData(JSON.parse(savedHistory));
      } catch (e) { console.error("History load error", e); }
    };
    loadSavedData();

    const showSub = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@nutrisnap_history', JSON.stringify(data));
  }, [data]);

  const startNewChat = () => {
    Alert.alert("New Chat", "Start a fresh conversation?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
          setData([]); 
          await AsyncStorage.removeItem('@nutrisnap_history');
      }}
    ]);
  };

  const handleSend = async () => {
    if (textInput.trim() === '') return;
    
    const userMessage = { role: 'user', text: textInput };
    const updatedHistory = [...data, userMessage];
    setData(updatedHistory);
    const messageToSend = textInput;
    setTextInput('');
    setLoading(true);

    try {
      const formattedHistory = updatedHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Send both history AND userId to the backend
      const response = await axios.post(apiUrl, { 
        history: formattedHistory,
        userId: userId // This prop is passed from AppNavigator
         }, {
        headers: { 'ngrok-skip-browser-warning': 'true' } // Required for ngrok
      });

 if (response.data && response.data.reply) {
        setData([...updatedHistory, { role: 'assistant', text: response.data.reply }]);
      } else {
        throw new Error("Invalid response format");
      }    } catch (error) {
      console.error(error);
      setData([...updatedHistory, { role: 'assistant', text: "Connection error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.iconCircle}><Text style={{ fontSize: 20 }}>🍎</Text></View>
                <View>
                  <Text style={styles.headerTitle}>NutriSnap AI</Text>
                  <Text style={styles.headerSubtitle}>Personal Nutritionist</Text>
                </View>
              </View>
              <TouchableOpacity onPress={startNewChat}>
                <Ionicons name="add-circle-outline" size={28} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          </View>

          {/* CHAT BODY */}
          <FlatList
            ref={flatListRef}
            data={data}
            keyExtractor={(item, index) => index.toString()}
            style={styles.chatBody}
            contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 15 }}
            onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <View style={[styles.messageWrapper, item.role === 'user' ? styles.userWrapper : styles.botWrapper]}>
                <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
                  {item.role === 'user' ? (
                     <Text style={styles.userText}>{item.text}</Text>
                  ) : (
                     <Markdown style={markdownStyles}>{item.text}</Markdown>
                  )}
                </View>
              </View>
            )}
          />

          {loading && <View style={styles.loadingArea}><Text style={styles.loadingText}>NutriSnap is thinking...</Text></View>}

          {/* DYNAMIC INPUT AREA */}
          <View style={[styles.inputWrapper, { paddingBottom: isKeyboardVisible ? 10 : 95 }]}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Type a health question..."
                placeholderTextColor="#99AA99"
              />
              <TouchableOpacity 
                  style={[styles.sendButton, { backgroundColor: textInput.trim() ? '#2E7D32' : '#A5D6A7' }]} 
                  onPress={handleSend}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default ChatGPT;

const markdownStyles = StyleSheet.create({
  body: { color: '#334433', fontSize: 15, lineHeight: 22 },
  strong: { fontWeight: 'bold', color: '#1B5E20' },
  bullet_list: { marginVertical: 10 },
  list_item: { marginVertical: 5, flexDirection: 'row', alignItems: 'flex-start' },
  heading3: { color: '#1B5E20', fontWeight: '800', marginVertical: 5 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F1F8E9' },
  container: { flex: 1 },
  header: { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E0EADF', elevation: 3 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F8E9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1B5E20' },
  headerSubtitle: { fontSize: 11, color: '#689F38', fontWeight: '500' },
  chatBody: { flex: 1 },
  messageWrapper: { marginVertical: 6, flexDirection: 'row', width: '100%' },
  userWrapper: { justifyContent: 'flex-end' },
  botWrapper: { justifyContent: 'flex-start' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, maxWidth: '85%' },
  userBubble: { backgroundColor: '#2E7D32', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E8F5E9' },
  userText: { color: '#FFFFFF', fontSize: 16, lineHeight: 22 },
  loadingArea: { paddingHorizontal: 20, paddingVertical: 5 },
  loadingText: { fontSize: 12, color: '#2E7D32', fontStyle: 'italic' },
  inputWrapper: { paddingHorizontal: 15, paddingTop: 10 },
  inputContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 30, paddingHorizontal: 15, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9', elevation: 5 },
  input: { flex: 1, height: 40, color: '#1B5E20', fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});