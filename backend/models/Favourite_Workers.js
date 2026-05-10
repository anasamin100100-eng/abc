const mongoose = require("mongoose");

const favouriteWorkerSchema = new mongoose.Schema({
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  added_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

favouriteWorkerSchema.index({ client_id: 1, worker_id: 1 }, { unique: true });

module.exports = mongoose.model("FavouriteWorker", favouriteWorkerSchema);
