const mongoose = require("mongoose");

const prebookingSchema = new mongoose.Schema({
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
}, { timestamps: true });

module.exports = mongoose.model("Prebooking", prebookingSchema);
