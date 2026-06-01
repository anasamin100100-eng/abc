const express = require("express");
const router = express.Router();
const JobRequest = require("../models/Job_Requests");
const auth = require("../middleware/auth");

// GET all jobs
router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 0;
    const query = JobRequest.find().sort({ requested_at: 1, _id: 1 });

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
router.post("/", auth, async (req, res) => {
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
router.put("/:id", auth, async (req, res) => {
  try {
    const updatedJob = await JobRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });

    const io = req.app.get("io");
    if (io) {
      io.emit("jobUpdated", updatedJob);
    }

    res.json(updatedJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
