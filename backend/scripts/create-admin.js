require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

const email = process.env.ADMIN_EMAIL 
const password = process.env.ADMIN_PASSWORD 
const name = process.env.ADMIN_NAME 

async function createAdmin() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        password: hashed,
        role: "admin",
      },
    },
    { new: true, upsert: true },
  );

  console.log(`Admin ready: ${user.email}`);
  console.log("Use the configured ADMIN_PASSWORD, or admin12345 if you did not set one.");
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
