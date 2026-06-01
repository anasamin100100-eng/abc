
const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true },
  name: String,
  category_type: String,
  description: String,
  icon_url: String,
});

module.exports = mongoose.model("Service", serviceSchema, "services");
