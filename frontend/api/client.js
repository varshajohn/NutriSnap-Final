// FILE: api/client.js

// ⚠️ CHANGE 1: Use your NGROK URL (matches your Chatbot and Scanner)
// ⚠️ CHANGE 2: Ensure it ends with /api
const API_BASE_URL = "https://unsubscribed-brittney-superably.ngrok-free.dev/api";

const apiClient = async (endpoint, method = 'GET', body = null) => {
  try {
    const options = {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', 
      },
    };
    if (body) options.body = JSON.stringify(body);

    // Debug log to see exactly where the app is trying to go
    console.log(`📡 Sending ${method} to: ${API_BASE_URL}/${endpoint}`);

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    
    // If the backend crashes, it sends HTML. This check handles it gracefully.
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Backend returned HTML instead of JSON. Check your backend console.");
        throw new Error("Server error. Please check backend logs.");
    }
    
    // Check if response is JSON
    const data = await response.json();
    
    if (!response.ok) {
        // This catches "User not found" or "Wrong password" from your backend
        throw new Error(data.message || 'Something went wrong');
    }
    
    console.log(`✅ ${endpoint} Success!`);
    return data;
  } catch (error) {
    // This catches "Network Request Failed" if ngrok is off
    console.error(`❌ API Error [${endpoint}]:`, error.message);
    throw error;
  }
};

export default apiClient;