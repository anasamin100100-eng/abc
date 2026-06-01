const mongoose = require("mongoose");

const priceOfferSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
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
});

module.exports = mongoose.model("PriceOffer", priceOfferSchema, "price_offers");
