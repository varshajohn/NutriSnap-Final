const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({

  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  age: { type: String, default: "" },
  height: { type: String, default: "" },
  weight: { type: String, default: "" },

  goal: { type: String, default: "" },

  avatar: {
    type: String,
    default: "https://www.pngmart.com/files/23/Profile-PNG-Photo.png"
  },

  allergies: { type: [String], default: [] },
  conditions: { type: [String], default: [] },

  dietaryPreference: {
    type: String,
    enum: ['None','Vegan','Vegetarian','Keto','Gluten-Free','Paleo'],
    default: 'None'
  },

  streak: { type: Number, default: 0 },

  lastLogDate: { type: Date, default: null },

  // ⭐ Daily balanced health badges
  dailyBadges: [
    {
      date: Date,
      badge: String
    }
  ]

});

module.exports = mongoose.model('User', UserSchema);