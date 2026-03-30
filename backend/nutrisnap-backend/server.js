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
const allergenData = require("./data/allergens.json");

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
  .then(() => console.log(' Connected to MongoDB: dietDB'))
  .catch(err => console.error(' MongoDB Connection error:', err));

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

/* --------------------  SMART RISK ENGINE (FINAL) -------------------- */
app.get('/api/health/risk-assessment', async (req, res) => {
  try {
    const { userId, period } = req.query;

const user = await User.findById(userId);

if (!user) {
  return res.status(404).json({ error: "User not found" });
}
   let startDate;
const now = new Date();

if (req.query.period === "weekly") {
  startDate = new Date();
  startDate.setDate(now.getDate() - 7);
} else {
  //  CURRENT MONTH FIX
  startDate = new Date(now.getFullYear(), now.getMonth(), 1);
}
    const logs = await DiaryEntry.find({ 
  userId, 
  date: { $gte: startDate },
  isDeleted: { $ne: true }   //  ADD THIS
});
    // ---------------- STREAK LOGIC ----------------

const logDates = [
  ...new Set(logs.map(l => new Date(l.date).toDateString()))
];

const today = new Date();
const todayStr = today.toDateString();

const hasLoggedToday = logDates.includes(todayStr);

let streak = 0;
let current = new Date();

if (!hasLoggedToday) {
  current.setDate(current.getDate() - 1);
}

while (true) {
  const currentStr = current.toDateString();

  if (logDates.includes(currentStr)) {
    streak++;
    current.setDate(current.getDate() - 1);
  } else {
    break;
  }
}

// WEEK DATA (for UI)
const weekData = [];

for (let i = 6; i >= 0; i--) {
  const d = new Date();
  d.setDate(d.getDate() - i);

  weekData.push({
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    logged: logDates.includes(d.toDateString())
  });
}

    if (logs.length < 5) {
  return res.json({
    status: "Insufficient Data",
    message: "Log at least 5 meals",
    indices: {
      hypertension: 0,
      diabetes: 0,
      obesity: 0,
      anemia: 0
    }
  });
}

const uniqueDays = [
  ...new Set(logs.map(l => new Date(l.date).toDateString()))
].length;

const daysFactor = Math.max(
  uniqueDays,
  period === "weekly" ? 7 : 30
);

    let totals = { sodium: 0, potassium: 0, gl: 0, cals: 0, iron: 0, carbs: 0 };
    logs.forEach(log => {
  totals.sodium += log.sodium_mg || 0;
  totals.potassium += log.potassium_mg || 0;
  totals.cals += log.calories || 0;
  totals.iron += log.iron_mg || 0;
  totals.carbs += log.carbs || 0;   // ADD THIS LINE
  totals.gl += ((log.glycemic_index || 55) * (log.carbs || 0)) / 100;
});

    // 1. REFINED HYPERTENSION (Na:K Ratio with Safety Baseline)
    const naKRatio = totals.sodium / Math.max(totals.potassium, (daysFactor * 500)); 
    let hRisk = naKRatio <= 1 ? naKRatio * 20 : 20 + ((naKRatio - 1) * 35);
    
    // 2. DIABETES (Glycemic Load)
    const dRisk = Math.min(((totals.gl / daysFactor) / 150) * 100, 100);

  // 3. OBESITY (Surplus vs TDEE)

// 1. Calculate BMR & TDEE (Keep this consistent)
const bmr = (10 * (user.weight || 70)) +
            (6.25 * (user.height || 170)) -
            (5 * (user.age || 25)) +
            (user.gender === 'female' ? -161 : 5);

const tdee = bmr * 1.3;

// 2. Normalize Intake based on the toggle
let currentIntake = 0;

if (period === 'daily') {
    // Logic for the 'Today' view
    currentIntake = logs
        .filter(l => new Date(l.date).toDateString() === new Date().toDateString())
        .reduce((sum, l) => sum + (Number(l.calories) || 0), 0);
} else {
    // Logic for Weekly/Monthly (Calculates Daily Average)
    // IMPORTANT: Ensure daysFactor is 7 for weekly and 30 for monthly
    const totalCals = Number(totals.cals) || 0;
    const factor = Number(daysFactor) || 1;
    currentIntake = totalCals / factor;
}

// 3. Calculate Difference from Maintenance
const calorieDiff = currentIntake - tdee;

// 4. Calculate oRisk (0 to 100)
let calculatedRisk = 0;

if (calorieDiff > 0) {
    // SURPLUS: Risk moves from 10% to 100%
    // We reach 100% risk if the user is 500+ calories over their TDEE
    calculatedRisk = 10 + (calorieDiff / 500) * 90;
} else {
    // DEFICIT: Risk stays very low (0% to 10%)
    // This provides a "smooth" transition instead of just 0.
    calculatedRisk = Math.max(10 + (calorieDiff / 500) * 10, 0);
}

// 5. Final Clamp (Ensure it never goes below 0 or above 100)
const oRisk = Math.min(Math.max(calculatedRisk, 0), 100);

console.log(`Period: ${period} | Avg Intake: ${currentIntake.toFixed(0)} | TDEE: ${tdee.toFixed(0)} | Risk: ${oRisk.toFixed(1)}%`);

    // 4. ANEMIA
   const aRisk = (totals.iron / daysFactor) < (user.gender === 'female' ? 18 : 8) ? 65 : 15;

//  FIXED BADGE LOGIC (END OF DAY)

if (!user.dailyBadges) user.dailyBadges = [];

//  yesterday start
const yesterdayStart = new Date();
yesterdayStart.setDate(yesterdayStart.getDate() - 1);
yesterdayStart.setHours(0,0,0,0);

//  yesterday end
const yesterdayEnd = new Date(yesterdayStart);
yesterdayEnd.setHours(23,59,59,999);

//  fetch ONLY yesterday logs
const yesterdayLogs = await DiaryEntry.find({
  userId,
  date: { $gte: yesterdayStart, $lte: yesterdayEnd }
});

if (yesterdayLogs.length > 0) {

  const alreadyExists = user.dailyBadges.find(b =>
    new Date(b.date).toDateString() === yesterdayStart.toDateString()
  );

  //  calculate totals for yesterday
  const yTotals = { sodium: 0, potassium: 0, carbs: 0, cals: 0 };

  yesterdayLogs.forEach(l => {
    yTotals.sodium += l.sodium_mg || 0;
    yTotals.potassium += l.potassium_mg || 0;
    yTotals.carbs += l.carbs || 0;
    yTotals.cals += l.calories || 0;
  });

  //  calculate risks
  const yNaK = yTotals.sodium / Math.max(yTotals.potassium, 500);
  const yHRisk = yNaK <= 1 ? yNaK * 20 : 20 + ((yNaK - 1) * 35);

  const yDRisk = Math.min(((yTotals.carbs) / 150) * 100, 100);

  const yDiff = yTotals.cals - tdee;
  let yORisk = yDiff > 0 ? Math.min((yDiff / 500) * 100, 100) : 10;

  const isBalancedDay =
    yHRisk < 40 &&
    yDRisk < 40 &&
    yORisk < 40;


    const badgeDate = new Date(yesterdayStart);

    //  FIX: force IST date (remove timezone shift)
    badgeDate.setHours(12, 0, 0, 0); 

  if (isBalancedDay && !alreadyExists) {

    user.dailyBadges.push({
      date: badgeDate,
      badge: "Balanced Day"
    });

    await user.save();
  }
}

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

  indices: {
    hypertension: Math.round(hRisk),
    diabetes: Math.round(dRisk),
    obesity: Math.round(oRisk),
    anemia: Math.round(aRisk)
  },

  rawTotals:{
    sodium: totals.sodium,
    potassium: totals.potassium,
    carbs: totals.carbs,
    avgGI: Math.round(totals.gl / (totals.carbs / 100 || 1))
  },

  insights:[dynamicInsight],

  healthStability: 100 - Math.round((hRisk + dRisk + oRisk) / 3),

  badgesCalendar: user.dailyBadges || [],

  streak: streak,
hasLoggedToday,
weekData,

  isBiometricsComplete: !!(user.weight && user.height && user.age)
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

    //  NEW: AI SAFETY AUDIT (This handles the different languages)
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

/* --------------------  INGREDIENT TRANSLATOR -------------------- */
app.post('/api/scan/translate', async (req, res) => {
  const { text } = req.body;
  
  console.log(" Translation Request Received for:", text?.substring(0, 20) + "...");

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
    console.log(" Translation Successful");
    res.json({ translatedText });

  } catch (err) {
    console.error(" Groq Translation Error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI translation failed" });
  }
});

/* --------------------  USER & AUTH -------------------- */
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



/* --------------------  DIARY & SUMMARY -------------------- */
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

/* --------------------  AI COACH (CONTEXT AWARE) -------------------- */
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

/* --------------------  YOLO FOOD DETECTION -------------------- */
app.post("/api/detect-food", upload.single("image"), async (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const imagePath = req.file.path;

  const pythonCmd = "python";
  const inferPath = path.join(__dirname, "..", "..", "ai-module", "infer.py");

  const args = [
    inferPath,
    imagePath
  ];

  execFile(pythonCmd, args, async (error, stdout, stderr) => {
    if (error) {
      console.error("Python error:", stderr);
      return res.status(500).json({ error: "Detection failed" });
    }

    try {
      const detections = JSON.parse(stdout);

const userId = req.body.userId;

let userAllergies = [];

if (userId) {
  const user = await User.findById(userId);

  userAllergies = (user?.allergies || []).map(a =>
    a.toLowerCase().replace(/s$/, "")
  );
}

const enrichedDetections = detections.map(d => {

  const key = d.label.toLowerCase().trim();

  const foodAllergens = allergenData[key] || [];

 const detectedAllergens = foodAllergens.filter(a =>
  userAllergies.includes(a.toLowerCase())
);

  return {
    label: d.label,
    confidence: d.confidence,
    nutrition: nutritionData[key] || null,
    allergens: foodAllergens,
    allergenWarning: detectedAllergens.length > 0,
    detectedAllergens
  };
});

res.json({ detections: enrichedDetections });
    } catch (e) {
      console.error("Invalid Python output:", stdout);
      res.status(500).json({ error: "Invalid model output" });
    }
  });
});

/* --------------------  FOOD RECOMMENDATION ENGINE -------------------- */
app.post("/api/recommend-food", async (req, res) => {
  try {

    const { userId, food } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const prompt = `
You are a clinical nutrition assistant for a mobile health application.

Evaluate whether the detected food fits the person's health goals and medical conditions.

USER PROFILE
Goal: ${user.goal}
Diet preference: ${user.dietaryPreference}
Health conditions: ${(user.conditions || []).join(", ") || "None"}
Allergies: ${(user.allergies || []).join(", ") || "None"}

FOOD
Name: ${food.name}

NUTRITION DATA
Calories: ${food.calories}
Protein: ${food.protein}
Carbohydrates: ${food.carbs}
Fat: ${food.fat}
Sugar: ${food.sugar}
Fiber: ${food.fiber}
Sodium: ${food.sodium}
Potassium: ${food.potassium}

CLINICAL EVALUATION GUIDELINES

Weight Loss
Prefer low calorie foods with fiber and moderate protein.
Avoid foods very high in calories, sugar, or deep fried fats.

Muscle Gain
Prefer foods rich in protein and balanced carbohydrates for recovery.

Diabetes
Avoid foods high in sugar or refined carbohydrates.
Fiber helps slow glucose absorption.

Hypertension
Avoid foods very high in sodium or heavily processed foods.

Pancreatitis / Gallbladder Issues
Avoid foods high in fat, oily foods, and deep fried foods.

General Nutrition Rule
Whole foods like fruits, vegetables, whole grains, and lean proteins are usually beneficial unless another condition makes them unsuitable.

IMPORTANT WRITING RULES
- Do NOT use phrases like "the user" or "user's goal".
- Speak naturally and directly.
- The explanation MUST mention BOTH the health condition and the goal when relevant.
- Clearly explain WHY the nutrients make the food suitable or unsuitable.
- Maximum 30 words.
- Minimum 18 words.
- Keep the explanation informative but concise.
- Use simple language suitable for a mobile health app.
- Never give medical treatment advice.

ALTERNATIVE FOOD RULES
If the food is not ideal:

1. Prefer healthier versions of the same food category when possible.
   Example:
   cake → sugar-free cake, low-carb cake
   fries → baked potato wedges
   burger → grilled chicken sandwich

2. If a similar alternative is not possible, suggest healthy foods aligned with the goal.

3. Avoid foods that conflict with dietary preference or allergies.

4. Provide exactly 4 alternatives.

TASK
Determine whether this food is ideal.

Return ONLY JSON in this format:

{
 "ideal": true or false,
 "reason": "clear explanation mentioning nutrition, health condition, and goal (18–30 words)",
 "alternatives": ["food1","food2","food3","food4"]
}
`;

    const aiRes = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" }
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
      }
    );

    const result = JSON.parse(aiRes.data.choices[0].message.content);

    res.json(result);

  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: "Recommendation failed" });
  }
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` NutriSnap Smart Backend Running on port ${PORT}`);
});