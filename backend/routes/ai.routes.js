const express = require("express");
const router = express.Router();
const Worker = require("../models/Workers");
const JobRequest = require("../models/Job_Requests");
const Review = require("../models/Reviews");
const WorkerTracking = require("../models/Worker_Tracking");
const User = require("../models/User");

// Haversine formula for distance calculation in KM
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 1. AI Reliability Scoring Engine Route
router.post("/reliability-score/:workerId", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.workerId);
    if (!worker) {
      return res.status(404).json({ error: "Worker record not found" });
    }

    // A. Completion Rate Factor (max 35 points)
    const completedCount = await JobRequest.countDocuments({ worker_id: worker.user_id, status: "completed" });
    const cancelledCount = await JobRequest.countDocuments({ worker_id: worker.user_id, status: "cancelled" });
    const totalJobsLogged = completedCount + cancelledCount;
    
    let completionScore = 25; // Default base completion points for beginners
    if (totalJobsLogged > 0) {
      const completionRate = completedCount / totalJobsLogged;
      completionScore = Math.round(completionRate * 35);
    }

    // B. Client Feedback Rating Factor (max 45 points)
    const reviews = await Review.find({ worker_id: worker.user_id });
    let averageRating = worker.rating || 4.0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, rev) => acc + (rev.rating || 0), 0);
      averageRating = sum / reviews.length;
    }
    const ratingScore = Math.round((averageRating / 5) * 45);

    // C. Base Stability Factor (constant 20 points)
    const baseStability = 20;

    // Compute dynamic AI reliability score (capped at 100)
    const computedReliability = Math.min(100, Math.max(50, completionScore + ratingScore + baseStability));

    // Update the database record
    worker.reliability_score = computedReliability;
    if (reviews.length > 0) {
      worker.rating = Number(averageRating.toFixed(1));
    }
    worker.total_jobs = await JobRequest.countDocuments({ worker_id: worker.user_id, status: "completed" });
    await worker.save();

    res.json({
      success: true,
      workerId: worker._id,
      completedJobs: completedCount,
      cancelledJobs: cancelledCount,
      averageRating: averageRating.toFixed(1),
      breakdown: {
        completionScorePoints: completionScore,
        clientRatingPoints: ratingScore,
        stabilityPoints: baseStability,
      },
      finalReliabilityScore: computedReliability,
    });
  } catch (error) {
    console.error("AI Reliability Scoring Error:", error);
    res.status(500).json({ error: "Failed to run AI reliability analysis" });
  }
});

// 2. AI Predictive Worker Matching Route
router.get("/predictive-match/:jobId", async (req, res) => {
  try {
    const job = await JobRequest.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job request not found" });
    }

    const jobLat = job.latitude || 24.8607; // Karachi center fallback
    const jobLng = job.longitude || 67.0011;

    // Find all workers registered under the same service category
    const candidateWorkers = await Worker.find({
      service_id: job.service_id,
      verification_status: "approved",
    });

    const rankedWorkers = await Promise.all(
      candidateWorkers.map(async (worker) => {
        // Resolve worker user name
        const user = await User.findById(worker.user_id);
        
        // Find latest worker tracking coordinates
        let workerLat = jobLat + 0.012; // default slight offset
        let workerLng = jobLng - 0.012;
        const tracking = await WorkerTracking.findOne({ worker_id: worker.user_id }).sort({ timestamp: -1 });
        if (tracking) {
          workerLat = tracking.latitude;
          workerLng = tracking.longitude;
        }

        // 1. Calculate distance (km)
        const distance = distanceKm(workerLat, workerLng, jobLat, jobLng);

        // 2. Compute matching rank score (out of 100 points)
        // - Distance weight: 40% (Closer is higher, e.g. 40 points if < 2km, drops to 0 if > 15km)
        const distanceScore = Math.max(0, Math.min(40, Math.round(40 - (distance * 2.5))));
        
        // - Reliability weight: 40% (reliability_score * 0.4)
        const reliabilityScore = Math.round((worker.reliability_score || 70) * 0.4);
        
        // - Star rating weight: 20% ((rating / 5) * 20)
        const ratingScore = Math.round(((worker.rating || 4.0) / 5) * 20);

        const matchPercentage = distanceScore + reliabilityScore + ratingScore;

        return {
          workerId: worker._id,
          name: user ? user.name : "Ustad Partner",
          phone: user ? user.phone : "No contact info",
          skills: worker.skills,
          rating: worker.rating,
          reliabilityScore: worker.reliability_score,
          distanceKm: Number(distance.toFixed(1)),
          matchingBreakdown: {
            distanceMatchPoints: distanceScore,
            reliabilityPoints: reliabilityScore,
            ratingPoints: ratingScore,
          },
          matchingScore: matchPercentage,
        };
      })
    );

    // Sort workers by matching score descending
    rankedWorkers.sort((a, b) => b.matchingScore - a.matchingScore);

    res.json({
      success: true,
      jobId: job._id,
      jobLocation: { latitude: jobLat, longitude: jobLng },
      matchedWorkersCount: rankedWorkers.length,
      recommendations: rankedWorkers,
    });
  } catch (error) {
    console.error("AI Predictive Match Error:", error);
    res.status(500).json({ error: "Failed to compute predictive worker match" });
  }
});

module.exports = router;
