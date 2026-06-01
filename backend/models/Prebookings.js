const mongoose = require("mongoose");

const prebookingSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  scheduled_at: Date,
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
  notes: String,
  reliability_score: Number,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Prebooking", prebookingSchema, "prebookings");
