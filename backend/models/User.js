const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  attribute_name: Number,
  password: String,
  role: {
    type: String,
    enum: ["admin", "worker", "client"],
    default: "client",
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);