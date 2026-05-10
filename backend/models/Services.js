
const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: String,
  category_type: String,
  description: String,
  icon_url: String,
}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema);