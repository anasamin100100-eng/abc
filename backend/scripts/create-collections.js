require("dotenv").config();
const mongoose = require("mongoose");

const models = [
  require("../models/Admin_Logs.js"),
  require("../models/Clients.js"),
  require("../models/Favourite_Workers.js"),
  require("../models/Job_Requests.js"),
  require("../models/Payments.js"),
  require("../models/Prebookings.js"),
  require("../models/Price_Offers.js"),
  require("../models/Reviews.js"),
  require("../models/Services.js"),
  require("../models/User.js"),
  require("../models/Workers.js"),
  require("../models/Worker_Tracking.js"),
];

async function createCollections() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all(models.map((model) => model.createCollection()));

  const collectionNames = models.map((model) => model.collection.name).sort();
  console.log("Collections ready:");
  collectionNames.forEach((name) => console.log(`- ${name}`));
}

createCollections()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
