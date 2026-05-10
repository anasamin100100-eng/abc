const mongoose = require("mongoose");

const priceOfferSchema = new mongoose.Schema({
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: "JobRequest" },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  offered_price: Number,
  message: String,
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  offered_at: Date,
  responded_at: Date,
}, { timestamps: true });

module.exports = mongoose.model("PriceOffer", priceOfferSchema);