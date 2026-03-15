const express = require('express');
const router = express.Router();
const DiaryEntry = require('../models/DiaryEntry');
const User = require('../models/User');

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

    const entry = new DiaryEntry({
      userId,
      productName,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      carbs: Number(carbs) || 0,
      sugar: Number(sugar) || 0,

      sodium_mg: Number(sodium_mg) || 0,
      potassium_mg: Number(potassium_mg) || 0,
      glycemic_index: Number(glycemic_index) || 55,
      iron_mg: Number(iron_mg) || 0,
      vitamin_c_mg: Number(vitamin_c_mg) || 0,

      date: req.body.date || Date.now()
    });

    await entry.save();

    /* -------------------- STREAK SYSTEM -------------------- */

    const user = await User.findById(userId);

    if (user) {

      const today = new Date();
      today.setHours(0,0,0,0);

      let last = null;

      if(user.lastLogDate){
        last = new Date(user.lastLogDate);
        last.setHours(0,0,0,0);
      }

      if(!last){
        // first ever log
        user.streak = 1;
      }
      else{

        const diffDays = (today - last) / (1000 * 60 * 60 * 24);

        if(diffDays === 1){
          // consecutive day
          user.streak += 1;
        }
        else if(diffDays > 1){
          // streak broken
          user.streak = 1;
        }
        // if diffDays === 0 → already logged today → keep streak same
      }

      user.lastLogDate = today;

      /* -------------------- BADGES -------------------- */

      if(user.streak >= 1 && !user.badges.includes("Weekly Warrior")){
        user.badges.push("Weekly Warrior");
      }

      if(user.streak >= 30 && !user.badges.includes("Nutrition Master")){
        user.badges.push("Nutrition Master");
      }

      await user.save();
    }

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

// DELETE an entry
router.delete('/:id', async (req, res) => {
  try {
    await DiaryEntry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

// EDIT an entry
router.put('/:id', async (req, res) => {
  try {
    const updatedEntry = await DiaryEntry.findByIdAndUpdate(
      req.params.id, 
      { 
        ...req.body,
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

module.exports = router;