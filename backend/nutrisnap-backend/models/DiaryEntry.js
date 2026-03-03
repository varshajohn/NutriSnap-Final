const mongoose = require('mongoose');

const diaryEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productName: { type: String, required: true },
  productData: { type: Object }, 
  
  // Basic Macronutrients
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },

  // --- NEW: Research-Oriented Fields ---
  
  // 1. For Hypertension Risk (Na:K Ratio)
  sodium_mg: { type: Number, default: 0 },
  potassium_mg: { type: Number, default: 0 },

  // 2. For Diabetes Risk (Glycemic Load calculation)
  // GL = (Glycemic Index * Net Carbs) / 100
  glycemic_index: { type: Number, default: 55 }, // Default to Low GI if unknown

  // 3. For Iron Deficiency Risk (Bioavailability calculation)
  iron_mg: { type: Number, default: 0 },
  vitamin_c_mg: { type: Number, default: 0 }, // Enhances non-heme iron absorption

  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiaryEntry', diaryEntrySchema);