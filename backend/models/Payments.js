const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: "JobRequest" },
  offer_id: { type: mongoose.Schema.Types.ObjectId, ref: "PriceOffer" },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  payment_status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  payment_method: {
    type: String,
    enum: ["cash", "card", "online"],
    default: "cash",
  },
  paid_at: Date,
});

module.exports = mongoose.model("Payment", paymentSchema, "payments");
