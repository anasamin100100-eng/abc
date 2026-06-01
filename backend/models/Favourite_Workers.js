const mongoose = require("mongoose");

const favouriteWorkerSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

favouriteWorkerSchema.index({ client_id: 1, worker_id: 1 }, { unique: true });

module.exports = mongoose.model("FavoriteWorker", favouriteWorkerSchema, "favorite_workers");
