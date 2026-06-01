const express = require("express");
const Worker = require("../models/Workers");

const router = express.Router();

const CNIC_PATTERN = /^\d{5}-?\d{7}-?\d$/;
const URL_PATTERN = /^https?:\/\/\S+/i;

function normalizeCnic(cnic = "") {
  return String(cnic).replace(/\s/g, "");
}

function buildWorkerVerification(worker) {
  const cnic = normalizeCnic(worker.cnic);
  const profilePicture = String(worker.profile_picture || "").trim();
  const skills = String(worker.skills || "").trim();

  const cnicValid = CNIC_PATTERN.test(cnic);
  const profilePictureFound = profilePicture.length > 0;
  const profilePictureLooksValid =
    profilePictureFound && (URL_PATTERN.test(profilePicture) || profilePicture.length > 8);
  const skillsFound = skills.length >= 3;

  let confidence = 10;
  const notes = [];

  if (cnicValid) {
    confidence += 40;
    notes.push("CNIC format looks valid");
  } else {
    notes.push("CNIC is missing or not in a valid Pakistani CNIC format");
  }

  if (profilePictureLooksValid) {
    confidence += 30;
    notes.push("Profile picture is available");
  } else {
    notes.push("Profile picture is missing");
  }

  if (skillsFound) {
    confidence += 15;
    notes.push("Worker skills are present");
  } else {
    notes.push("Worker skills are missing");
  }

  if ((worker.rating || 0) >= 4 || (worker.reliability_score || 0) >= 70) {
    confidence += 5;
    notes.push("Reliability signals are positive");
  }

  confidence = Math.min(100, confidence);

  const recommendation =
    cnicValid && profilePictureLooksValid && confidence >= 75
      ? "approved"
      : confidence < 45
        ? "rejected"
        : "pending";

  return {
    worker_id: worker._id,
    cnicValid,
    profilePictureFound,
    skillsFound,
    confidence,
    recommendation,
    notes,
  };
}

router.post("/workers/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const result = buildWorkerVerification(worker);

    if (req.body?.apply === true && result.recommendation !== "pending") {
      worker.verification_status = result.recommendation;
      await worker.save();
      result.applied = true;
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
