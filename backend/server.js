require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const dns = require("dns");
const { Server } = require("socket.io");
const auth = require("./middleware/auth");

const app = express();

// Some campus/office DNS servers block MongoDB Atlas SRV lookups.
// Use public resolvers locally so mongodb+srv URIs work more reliably.
dns.setServers((process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1").split(","));

app.use(cors());
app.use(express.json());

const models = [
  require("./models/Admin_Logs.js"),
  require("./models/Clients.js"),
  require("./models/Favourite_Workers.js"),
  require("./models/Job_Requests.js"),
  require("./models/Payments.js"),
  require("./models/Prebookings.js"),
  require("./models/Price_Offers.js"),
  require("./models/Reviews.js"),
  require("./models/Services.js"),
  require("./models/User.js"),
  require("./models/Workers.js"),
  require("./models/Worker_Tracking.js"),
];

let dbReadyPromise = null;

async function ensureCollections() {
  try {
    await Promise.all(models.map((model) => model.createCollection()));
    console.log("MongoDB collections ready");
  } catch (err) {
    console.log("Collection creation warning:", err.message);
  }
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (dbReadyPromise) {
    return dbReadyPromise;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  dbReadyPromise = connectDBOnce().catch((err) => {
    dbReadyPromise = null;
    throw err;
  });

  return dbReadyPromise;
}

async function connectDBOnce() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB Connected");
    await ensureCollections();
    return mongoose.connection;
  } catch (err) {
    console.error("MongoDB Connection Failed:");
    console.error(err.message);
    throw err;
  }
}

let server = null;

if (!process.env.VERCEL) {
  server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
}

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connected" });
});

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed", details: err.message });
  }
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/jobs", require("./routes/job.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/verification", auth, require("./routes/verification.routes"));
app.use("/api/eta", require("./routes/eta.routes"));
app.use("/api/ai", auth, require("./routes/ai.routes"));

app.post("/api/predict-eta", async (req, res) => {
  try {
    const { workerLat, workerLng, jobLat, jobLng } = req.body;

    if (workerLat === undefined || workerLng === undefined || jobLat === undefined || jobLng === undefined) {
      return res.status(400).json({ error: "Missing location coordinates" });
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    const distance = getDistanceFromLatLonInKm(Number(workerLat), Number(workerLng), Number(jobLat), Number(jobLng));
    const estimatedMinutes = Math.max(5, Math.round(distance * 2 + 5));
    const etaText =
      estimatedMinutes < 60
        ? `${estimatedMinutes} min`
        : `${Math.floor(estimatedMinutes / 60)} hr ${estimatedMinutes % 60} min`;

    res.json({
      success: true,
      distance: distance.toFixed(1),
      estimatedMinutes,
      etaText,
    });
  } catch (error) {
    console.error("ETA Error:", error);
    res.status(500).json({ error: "Failed to predict ETA" });
  }
});

const createCrudRouter = require("./routes/crud.routes");

app.use("/api/admin-logs", createCrudRouter(require("./models/Admin_Logs")));
app.use("/api/clients", createCrudRouter(require("./models/Clients")));
app.use("/api/favourite-workers", createCrudRouter(require("./models/Favourite_Workers")));
app.use("/api/payments", createCrudRouter(require("./models/Payments")));
app.use("/api/prebookings", createCrudRouter(require("./models/Prebookings")));
app.use("/api/price-offers", createCrudRouter(require("./models/Price_Offers")));
app.use("/api/reviews", createCrudRouter(require("./models/Reviews")));
app.use("/api/services", createCrudRouter(require("./models/Services")));
app.use("/api/users", createCrudRouter(require("./models/User")));
app.use("/api/workers", createCrudRouter(require("./models/Workers")));
app.use("/api/worker-tracking", createCrudRouter(require("./models/Worker_Tracking")));

const PORT = process.env.PORT || 5001;

if (!process.env.VERCEL) {
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other backend process or set PORT to another value.`);
      process.exit(1);
    }

    throw err;
  });

  server.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      await connectDB();
    } catch {
      process.exit(1);
    }
  });
}

module.exports = app;
