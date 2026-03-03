const express = require('express');
const router = express.Router();
const DiaryEntry = require('../models/DiaryEntry');

// Add a diary entry

router.post('/add', async (req, res) => {
  const { 
    userId, 
    productName, 
    calories, 
    protein, 
    fat, 
    carbs, 
    sugar,
    sodium_mg, 
    potassium_mg, 
    glycemic_index, 
    iron_mg, 
    vitamin_c_mg 
  } = req.body;

  if (!userId || !productName) {
    return res.status(400).json({ error: "userId and productName are required" });
  }

  try {
    // We explicitly map the fields to ensure they are saved as Numbers
    const entry = new DiaryEntry({
      userId,
      productName,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      carbs: Number(carbs) || 0,
      sugar: Number(sugar) || 0,
      // --- NEW RESEARCH FIELDS ---
      sodium_mg: Number(sodium_mg) || 0,
      potassium_mg: Number(potassium_mg) || 0,
      glycemic_index: Number(glycemic_index) || 55,
      iron_mg: Number(iron_mg) || 0,
      vitamin_c_mg: Number(vitamin_c_mg) || 0,
      date: req.body.date || Date.now()
    });

    await entry.save();
    console.log(`✅ Logged: ${productName} (Na: ${entry.sodium_mg}mg, K: ${entry.potassium_mg}mg)`);
    res.json(entry);
  } catch (err) {
    console.error("❌ Failed to add diary entry:", err);
    res.status(500).json({ error: "Failed to add diary entry" });
  }
});

// Get all diary entries for a user
router.get('/:userId', async (req, res) => {
  try {
    const entries = await DiaryEntry.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch diary entries" });
  }
});

// 1. DELETE an entry
router.delete('/:id', async (req, res) => {
  try {
    await DiaryEntry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// 2. EDIT an entry
router.put('/:id', async (req, res) => {
  try {
    const updatedEntry = await DiaryEntry.findByIdAndUpdate(
      req.params.id, 
      { 
        ...req.body,
        // Ensure numbers are cast correctly if they were edited
        sodium_mg: Number(req.body.sodium_mg),
        potassium_mg: Number(req.body.potassium_mg),
        glycemic_index: Number(req.body.glycemic_index)
      }, 
      { new: true }
    );
    res.json(updatedEntry);
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

// EMERGENCY ROUTE: Delete all logs for today for a specific user
// Use 'router' instead of 'app' 
// Also, remove the '/api/diary' prefix because it's already defined in server.js
// router.delete('/clear-today/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Create boundaries for today
//     const start = new Date();
//     start.setHours(0, 0, 0, 0);

//     const end = new Date();
//     end.setHours(23, 59, 59, 999);

//     const result = await DiaryEntry.deleteMany({
//       userId: userId,
//       date: { $gte: start, $lte: end }
//     });

//     console.log(`🧹 Deleted ${result.deletedCount} entries for user ${userId}`);
//     res.json({ message: "Today's logs cleared!", deletedCount: result.deletedCount });
//   } catch (err) {
//     console.error("Delete Error:", err);
//     res.status(500).json({ error: "Failed to clear logs" });
//   }
// });

module.exports = router;
