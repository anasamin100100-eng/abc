require("dotenv").config();
const dns = require("dns");
dns.setServers((process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1").split(","));

const mongoose = require("mongoose");
const Worker = require("./models/Workers");
const JobRequest = require("./models/Job_Requests");
const Review = require("./models/Reviews");
const User = require("./models/User");

// Distance formula
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

async function test() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing in .env");
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB successfully");

  // 1. Fetch a worker
  const worker = await Worker.findOne();
  if (worker) {
    console.log(`\nTesting AI Reliability Score for Worker: ${worker.cnic}`);
    
    const completedCount = await JobRequest.countDocuments({ worker_id: worker.user_id, status: "completed" });
    const cancelledCount = await JobRequest.countDocuments({ worker_id: worker.user_id, status: "cancelled" });
    const totalJobsLogged = completedCount + cancelledCount;
    
    let completionScore = 25;
    if (totalJobsLogged > 0) {
      const completionRate = completedCount / totalJobsLogged;
      completionScore = Math.round(completionRate * 35);
    }

    const reviews = await Review.find({ worker_id: worker.user_id });
    let averageRating = worker.rating || 4.0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, rev) => acc + (rev.rating || 0), 0);
      averageRating = sum / reviews.length;
    }
    const ratingScore = Math.round((averageRating / 5) * 45);
    const baseStability = 20;
    const computedReliability = Math.min(100, Math.max(50, completionScore + ratingScore + baseStability));

    console.log({
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
  }

  // 2. Fetch a job request
  const job = await JobRequest.findOne();
  if (job) {
    console.log(`\nTesting AI Predictive Worker Matching for Job: ${job.id}`);
    const jobLat = job.latitude || 24.8607;
    const jobLng = job.longitude || 67.0011;

    const candidateWorkers = await Worker.find({ service_id: job.service_id });
    console.log(`Found ${candidateWorkers.length} candidate workers for category matching.`);

    const rankedWorkers = await Promise.all(
      candidateWorkers.map(async (worker) => {
        const user = await User.findById(worker.user_id);
        const distance = distanceKm(jobLat + 0.01, jobLng - 0.01, jobLat, jobLng);
        const distanceScore = Math.max(0, Math.min(40, Math.round(40 - (distance * 2.5))));
        const reliabilityScore = Math.round((worker.reliability_score || 70) * 0.4);
        const ratingScore = Math.round(((worker.rating || 4.0) / 5) * 20);
        const matchPercentage = distanceScore + reliabilityScore + ratingScore;

        return {
          workerId: worker._id,
          name: user ? user.name : "Ustad Partner",
          distanceKm: Number(distance.toFixed(1)),
          matchingScore: matchPercentage,
        };
      })
    );

    rankedWorkers.sort((a, b) => b.matchingScore - a.matchingScore);
    console.log("Ranked Recommendation Results:");
    console.log(JSON.stringify(rankedWorkers, null, 2));
  }

  await mongoose.disconnect();
}

test().catch(console.error);
