require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const User = require('./models/User');
const DiaryEntry = require('./models/DiaryEntry');

const app = express();
const { execFile } = require("child_process");
const multer = require("multer");
const path = require("path");
const nutritionData = require("./data/nutrition.json");

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/* -------------------- 📦 MULTER CONFIG -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

/* -------------------- DB -------------------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB: dietDB'))
  .catch(err => console.error('❌ MongoDB Connection error:', err));

/* -------------------- HELPER: QUICK RISK PROFILE FOR AI -------------------- */
async function getQuickRiskProfile(userId) {
  try {
    const logs = await DiaryEntry.find({ userId }).sort({ date: -1 }).limit(15);
    if (logs.length < 3) return "New user: Insufficient data for clinical profiling.";

    let totals = { sodium: 0, potassium: 0, gl: 0 };
    logs.forEach(l => {
      totals.sodium += l.sodium_mg || 0;
      totals.potassium += l.potassium_mg || 0;
      totals.gl += ((l.glycemic_index || 55) * (l.carbs || 0)) / 100;
    });

    const naKRatio = totals.sodium / Math.max(totals.potassium, 500);
    return `[System Profile]: Na:K Ratio ${naKRatio.toFixed(1)}, Avg Daily Glycemic Load ${(totals.gl / 3).toFixed(1)}.`;
  } catch (e) { return "Profile unavailable."; }
}

/* -------------------- BASIC ROUTE -------------------- */
app.get('/', (req, res) => {
  res.send('NutriSnap Smart Health Backend is running...');
});

/* -------------------- 🟢 SMART RISK ENGINE (FINAL) -------------------- */
app.get('/api/health/risk-assessment', async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const logs = await DiaryEntry.find({ userId, date: { $gte: thirtyDaysAgo } });

    if (logs.length < 5) {
      return res.json({ status: "Gathering Data", message: "Log 5+ meals to unlock clinical report." });
    }

    const uniqueDays = [...new Set(logs.map(l => new Date(l.date).toDateString()))].length;
    const daysFactor = uniqueDays || 1;

    let totals = { sodium: 0, potassium: 0, gl: 0, cals: 0, iron: 0 };
    logs.forEach(log => {
      totals.sodium += log.sodium_mg || 0;
      totals.potassium += log.potassium_mg || 0;
      totals.cals += log.calories || 0;
      totals.iron += log.iron_mg || 0;
      totals.gl += ((log.glycemic_index || 55) * (log.carbs || 0)) / 100;
    });

    // 1. REFINED HYPERTENSION (Na:K Ratio with Safety Baseline)
    const naKRatio = totals.sodium / Math.max(totals.potassium, (daysFactor * 500)); 
    let hRisk = naKRatio <= 1 ? naKRatio * 20 : 20 + ((naKRatio - 1) * 35);
    
    // 2. DIABETES (Glycemic Load)
    const dRisk = Math.min(((totals.gl / daysFactor) / 150) * 100, 100);

    // 3. OBESITY (Surplus vs TDEE)
    const bmr = (10 * (user.weight || 70)) + (6.25 * (user.height || 170)) - (5 * (user.age || 25)) + (user.gender === 'female' ? -161 : 5);
    const tdee = bmr * 1.3;
    const oRisk = Math.min((Math.max(0, (totals.cals / daysFactor) - tdee) / 500) * 100, 100);

    // 4. ANEMIA
    const aRisk = (totals.iron / daysFactor) < (user.gender === 'female' ? 18 : 8) ? 65 : 15;

    // 5. DYNAMIC AI INSIGHT (Groq Powered)
    let dynamicInsight = "";
    try {
        const aiRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: `Nutritionist: Review scores (BP:${Math.round(hRisk)}%, Sugar:${Math.round(dRisk)}%, Weight:${Math.round(oRisk)}%). Give ONE encouraging sentence and a specific food swap.` }],
            temperature: 0.7
        }, { headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` } });
        dynamicInsight = aiRes.data.choices[0].message.content;
    } catch (e) { dynamicInsight = "Keep balancing your greens and proteins for optimal stability."; }

    res.json({
      status: "Success",
      indices: { hypertension: Math.round(hRisk), diabetes: Math.round(dRisk), obesity: Math.round(oRisk), anemia: Math.round(aRisk) },
      rawTotals: {
    sodium: totals.sodium,
    potassium: totals.potassium,
    carbs: totals.carbs,
    avgGI: Math.round(totals.gl / (totals.carbs / 100 || 1))
  },
      insights: [dynamicInsight],
      healthStability: 100 - Math.round((hRisk + dRisk + oRisk) / 3),
      isBiometricsComplete: !!(user.weight && user.height && user.age),
      stabilityStreak: 3 // Hardcoded simulation
    });
  } catch (err) { res.status(500).json({ error: "Risk Engine Error" }); }
});

/* -------------------- 📸 AI SNAP (IMAGE ANALYSIS) -------------------- */
app.post('/api/scan/image', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      const prompt = `Analyze this food image. Return JSON ONLY: { "name": string, "calories": number, "ingredients": string, "carbs": number, "protein": number, "fat": number, "sugar": number, "sodium_mg": number, "potassium_mg": number, "glycemic_index": number, "iron_mg": number, "vitamin_c_mg": number }`;
  
      const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
          model: "llama-3.2-11b-vision-preview",
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }] }],
          response_format: { type: "json_object" }
        }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } }
      );
      res.json(JSON.parse(response.data.choices[0].message.content));
    } catch (err) { res.status(500).json({ error: "Vision AI Failed" }); }
});

/* -------------------- 🔍 BARCODE ANALYSIS -------------------- */
app.post('/api/scan/analyze', async (req, res) => {
  const { barcode, allergies = [] } = req.body;
  try {
    const offRes = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (offRes.data.status !== 1) return res.status(404).json({ error: "Product not found" });

    const p = offRes.data.product;
    const n = p.nutriments;
    const ingredientsText = p.ingredients_text || "Ingredients not listed";

    // 🟢 NEW: AI SAFETY AUDIT (This handles the different languages)
    let aiDetectedAllergens = [];
    if (allergies.length > 0 && ingredientsText !== "Ingredients not listed") {
      try {
        const auditResponse = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
          model: "llama-3.3-70b-versatile",
          messages: [{
            role: "system",
            content: `You are a clinical food safety expert. 
            USER ALLERGIES: ${allergies.join(", ")}
            INGREDIENT LIST: ${ingredientsText}
            
            TASK: Identify if any ingredients match the allergies. 
            1. The list might be in a foreign language; translate it mentally.
            2. Look for derivatives (e.g., 'Whey' contains 'Milk').
            Return ONLY a JSON object: {"detected": ["Allergy1", "Allergy2"]}. If none, return {"detected": []}.`
          }],
          response_format: { type: "json_object" }
        }, { headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` } });

        const result = JSON.parse(auditResponse.data.choices[0].message.content);
        aiDetectedAllergens = result.detected || [];
      } catch (e) {
        console.error("AI Safety Audit Failed:", e.message);
      }
    }

    res.json({
      name: p.product_name,
      calories: n['energy-kcal_100g'] || 0,
      protein: n.proteins_100g || 0,
      fat: n.fat_100g || 0,
      carbs: n.carbohydrates_100g || 0,
      sugar: n.sugars_100g || 0,
      sodium_mg: (n.sodium_100g || 0) * 1000,
      potassium_mg: (n.potassium_100g || 0) * 1000,
      glycemic_index: (n.sugars_100g / (n.carbohydrates_100g || 1)) > 0.5 ? 85 : 45,
      ingredients: ingredientsText,
      detectedAllergens: aiDetectedAllergens, // 🟢 AI result sent to frontend
      sources: ["Open Food Facts", "AI Safety Audit"]
    });
  } catch (err) { res.status(500).json({ error: "Scan Error" }); }
});

/* -------------------- 🌐 INGREDIENT TRANSLATOR -------------------- */
app.post('/api/scan/translate', async (req, res) => {
  const { text } = req.body;
  
  console.log("🌐 Translation Request Received for:", text?.substring(0, 20) + "...");

  if (!text || text === "Ingredients not listed") {
    return res.status(400).json({ error: "No valid ingredients to translate" });
  }

  try {
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile", // Ensure this model name is correct
      messages: [
        {
          role: "system",
          content: "You are a food scientist. Translate the provided ingredient list into English. Return ONLY the translated comma-separated list. No intro text."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1
    }, { 
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` } 
    });

    const translatedText = response.data.choices[0].message.content;
    console.log("✅ Translation Successful");
    res.json({ translatedText });

  } catch (err) {
    console.error("❌ Groq Translation Error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI translation failed" });
  }
});

/* -------------------- 👤 USER & AUTH -------------------- */
app.get('/api/user/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      res.json(user);
    } catch (err) { res.status(500).json({ error: "Fetch Error" }); }
});

app.put('/api/user/:id', async (req, res) => {
    try {
      const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
      res.json(updated);
    } catch (err) { res.status(500).json({ error: "Update Error" }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Invalid credentials" });
      res.json({ _id: user._id, email: user.email, name: user.name });
    } catch (err) { res.status(500).json({ error: "Login Error" }); }
});

app.post('/api/register', async (req, res) => {
    try {
      const hashed = await bcrypt.hash(req.body.password, 10);
      const newUser = new User({ ...req.body, password: hashed });
      await newUser.save();
      res.json({ _id: newUser._id, email: newUser.email, name: newUser.name });
    } catch (err) { res.status(500).json({ error: "Register Error" }); }
});



/* -------------------- 📊 DIARY & SUMMARY -------------------- */
app.get('/api/todaySummary', async (req, res) => {
    try {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const entries = await DiaryEntry.find({ userId: req.query.userId, date: { $gte: start, $lte: end } });
      const summary = entries.reduce((acc, e) => {
        acc.calories += Math.round(Number(e.calories)) || 0;
        acc.protein += Math.round(Number(e.protein)) || 0;
        acc.fat += Math.round(Number(e.fat)) || 0;
        acc.carbs += Math.round(Number(e.carbs)) || 0;
        return acc;
      }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
      res.json(summary);
    } catch (err) { res.status(500).json({ error: "Summary error" }); }
});

const diaryRoutes = require('./routes/diary');
app.use('/api/diary', diaryRoutes);

app.post('/api/scan/compare-logic', async (req, res) => {
  const { itemA, itemB, userId } = req.body;
  try {
    const user = await User.findById(userId);
    const risks = await getQuickRiskProfile(userId);
    
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile",
        messages: [{
            role: "system",
            content: `You are a clinical judge. 
            User Context: ${risks}, Preference: ${user.dietaryPreference}.
            Item A: ${itemA.name} (Sodium: ${itemA.sodium_mg}mg, GI: ${itemA.glycemic_index})
            Item B: ${itemB.name} (Sodium: ${itemB.sodium_mg}mg, GI: ${itemB.glycemic_index})
            Explain which is better in ONE short sentence. Mention the specific risk it helps.`
        }],
    }, { headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` } });

    res.json({ winnerAnalysis: response.data.choices[0].message.content });
  } catch (err) { res.status(500).json({ error: "Comparison Error" }); }
});

/* -------------------- 🤖 AI COACH (CONTEXT AWARE) -------------------- */
app.post("/api/chat", async (req, res) => {
    try {
        const { history, userId } = req.body;
        const user = await User.findById(userId);
        const riskProfile = await getQuickRiskProfile(userId);

        const systemPrompt = `
          IDENTITY: NutriSnap AI Clinical Coach.
          USER CONTEXT: ${user.name}, Goal: ${user.goal}, Preference: ${user.dietaryPreference}.
          RESEARCH PROFILE: ${riskProfile}
    
          STRICT RULE: Your food suggestions MUST follow the "${user.dietaryPreference}" diet. 
          If a user asks for something non-compliant, explain why it doesn't fit their preference.
        `;

        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: systemPrompt }, ...history]
        }, { headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` } });

        res.json({ reply: response.data.choices[0].message.content });
    } catch (error) { res.status(500).json({ error: "Chat Error" }); }
});

/* -------------------- 🧠 YOLO FOOD DETECTION -------------------- */
app.post("/api/detect-food", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;

  const pythonCmd = "py";
  const inferPath = path.join(__dirname, "..", "..", "ai-module", "infer.py");

  const args = [
    "-3.10",
    inferPath,
    imagePath
  ];

  execFile(pythonCmd, args, (error, stdout, stderr) => {
    if (error) {
      console.error("Python error:", stderr);
      return res.status(500).json({ error: "Detection failed" });
    }

    try {
      const detections = JSON.parse(stdout);

      const enrichedDetections = detections.map(d => ({
        label: d.label,
        confidence: d.confidence,
        nutrition: nutritionData[d.label] || null
      }));

      res.json({ detections: enrichedDetections });

    } catch (e) {
      console.error("Invalid Python output:", stdout);
      res.status(500).json({ error: "Invalid model output" });
    }
  });
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NutriSnap Smart Backend Running on port ${PORT}`);
});