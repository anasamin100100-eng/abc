const mongoose = require("mongoose");

const workerTrackingSchema = new mongoose.Schema({
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: "JobRequest" },
  latitude: {
    type: Number,
    min: -90,
    max: 90,
    required: true,
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

module.exports = mongoose.model("WorkerTracking", workerTrackingSchema);
