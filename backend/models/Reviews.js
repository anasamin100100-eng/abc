const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: "JobRequest" },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: "Rating must be an integer",
    },
  },
  comment: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Review", reviewSchema, "reviews");
