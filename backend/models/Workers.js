const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  cnic: String,
  profile_picture: String,
  skills: String,
  verification_status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reliability_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  total_jobs: {
    type: Number,
    min: 0,
    default: 0,
  },
});

module.exports = mongoose.model("Worker", workerSchema, "workers");
