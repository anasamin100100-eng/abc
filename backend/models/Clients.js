const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  address: String,
  city: String,
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Client", clientSchema, "clients");
