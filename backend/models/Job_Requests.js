const mongoose = require("mongoose");

const jobRequestSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
  },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  prebooking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Prebooking" },
  description: String,
  video_url: String,
  location: String,
  latitude: Number,
  longitude: Number,
  suggested_price: Number,
  status: {
    type: String,
    enum: ["pending", "assigned", "in_progress", "completed", "cancelled"],
    default: "pending",
  },
  offer_status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  requested_at: Date,
  completed_at: Date,
}, { timestamps: true });

module.exports = mongoose.model("JobRequest", jobRequestSchema);
