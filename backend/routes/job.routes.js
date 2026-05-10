const express = require("express");
const router = express.Router();
const JobRequest = require("../models/Job_Requests");

const seedJobs = [
  [
    "#JOB-1001",
    "Electrician",
    "Gulshan-e-Iqbal",
    "Imran Sheikh",
    "IS",
    "24.9065",
    "67.0835",
    "12 min",
    "assigned",
  ],
  [
    "#JOB-1002",
    "Plumbing",
    "DHA Phase 6",
    "Asif Ali",
    "AA",
    "24.7936",
    "67.0643",
    "Arrived",
    "in_progress",
  ],
  [
    "#JOB-1003",
    "AC Repair",
    "North Nazimabad",
    "Bilal Ahmed",
    "BA",
    "24.9537",
    "67.0439",
    "8 min",
    "assigned",
  ],
  [
    "#JOB-1004",
    "Electrician",
    "Clifton",
    "Zubair Ahmed",
    "ZA",
    "24.8138",
    "67.0308",
    "18 min",
    "assigned",
  ],
  [
    "#JOB-1005",
    "Plumbing",
    "Korangi",
    "Irfan Farooq",
    "IF",
    "24.8396",
    "67.1209",
    "in_progress",
  ],
  [
    "#JOB-1006",
    "AC Repair",
    "Malir",
    "Sana Malik",
    "SM",
    "24.8934",
    "67.2001",
    "22 min",
    "assigned",
  ],
  [
    "#JOB-1007",
    "Electrician",
    "Saddar",
    "Ali Hassan",
    "AH",
    "24.8556",
    "67.0303",
    "Arrived",
    "in_progress",
  ],
  [
    "#JOB-1008",
    "Plumbing",
    "Gulistan-e-Jauhar",
    "Muhammad Usman",
    "MU",
    "24.9271",
    "67.1381",
    "15 min",
    "assigned",
  ],
  [
    "#JOB-1009",
    "AC Repair",
    "PECHS",
    "Fatima Malik",
    "FM",
    "24.8659",
    "67.0669",
    "in_progress",
  ],
  [
    "#JOB-1010",
    "Electrician",
    "Bahadurabad",
    "Omar Malik",
    "OM",
    "24.8841",
    "67.0677",
    "10 min",
    "assigned",
  ],
].map(([id, service, area, worker, initials, lat, lng, eta, status]) => ({
  id,
  service,
  area,
  worker,
  initials,
  latitude: lat,
  longitude: lng,
  eta,
  status,
}));

async function ensureSeedJobs() {
  const existingCount = await JobRequest.countDocuments();

  if (existingCount >= 10) return;

  const existingIds = new Set((await JobRequest.find({}, "id")).map((job) => job.id));
  const missingJobs = seedJobs.filter((job) => !existingIds.has(job.id));

  if (missingJobs.length > 0) {
    await JobRequest.insertMany(missingJobs.slice(0, 10 - existingCount));
  }
}

// GET all jobs
router.get("/", async (req, res) => {
  try {
    await ensureSeedJobs();
    const limit = Number(req.query.limit) || 0;
    const query = JobRequest.find().sort({ createdAt: 1, _id: 1 });

    if (limit > 0) {
      query.limit(limit);
    }

    const jobs = await query;
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE job
router.post("/", async (req, res) => {
  try {
    const job = new JobRequest({
      id: `#JOB-${Date.now()}`,
      ...req.body,
    });

    await job.save();
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE job + SOCKET EMIT
router.put("/:id", async (req, res) => {
  try {
    const updatedJob = await JobRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });

    const io = req.app.get("io");

    io.emit("jobUpdated", updatedJob);

    res.json(updatedJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
