const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
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
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema, "users");
