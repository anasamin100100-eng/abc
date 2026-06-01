const express = require("express");
const JobRequest = require("../models/Job_Requests");
const WorkerTracking = require("../models/Worker_Tracking");

const router = express.Router();

const KARACHI_CENTER = {
  latitude: 24.8607,
  longitude: 67.0011,
};

function isMongoObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value));
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function radians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(origin, destination) {
  const earthRadiusKm = 6371;
  const dLat = radians(destination.latitude - origin.latitude);
  const dLng = radians(destination.longitude - origin.longitude);
  const lat1 = radians(origin.latitude);
  const lat2 = radians(destination.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function deterministicOffset(seed = "") {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }

  const latOffset = 0.018 + (hash % 18) / 1000;
  const lngOffset = 0.018 + ((hash >> 3) % 18) / 1000;

  return {
    latitude: latOffset,
    longitude: lngOffset,
  };
}

function trafficFactor(date = new Date()) {
  const hour = date.getHours();

  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) return 1.45;
  if (hour >= 12 && hour <= 16) return 1.15;
  if (hour >= 22 || hour <= 6) return 0.9;

  return 1;
}

function buildEta(origin, destination, options = {}) {
  const distance = distanceKm(origin, destination);
  const factor = trafficFactor();
  const baseSpeedKmH = options.baseSpeedKmH || 26;
  const effectiveSpeedKmH = baseSpeedKmH / factor;
  const pickupBufferMinutes = options.pickupBufferMinutes ?? 4;
  const etaMinutes = Math.max(1, Math.ceil((distance / effectiveSpeedKmH) * 60 + pickupBufferMinutes));

  return {
    origin,
    destination,
    distance_km: Number(distance.toFixed(2)),
    eta_minutes: etaMinutes,
    eta_label: etaMinutes <= 1 ? "1 min" : `${etaMinutes} mins`,
    traffic_factor: Number(factor.toFixed(2)),
    effective_speed_kmh: Number(effectiveSpeedKmH.toFixed(1)),
    confidence: options.hasLiveTracking ? 82 : 62,
    generated_at: new Date().toISOString(),
    notes: options.hasLiveTracking
      ? ["ETA calculated from latest worker tracking location"]
      : ["ETA calculated from fallback worker location until live tracking starts"],
  };
}

function pointFromLocation(location) {
  if (!location || typeof location !== "object") return null;

  const latitude = toNumber(location.latitude ?? location.lat);
  const longitude = toNumber(location.longitude ?? location.lng ?? location.lon);

  if (latitude === null || longitude === null) return null;

  return { latitude, longitude };
}

function coordinatesFromBody(body) {
  const workerFromNested = pointFromLocation(body.workerLocation ?? body.worker_location);
  const jobFromNested = pointFromLocation(body.jobLocation ?? body.job_location);

  const origin =
    workerFromNested ||
    pointFromLocation({
      latitude: body.workerLatitude ?? body.origin?.latitude ?? body.origin?.lat,
      longitude: body.workerLongitude ?? body.origin?.longitude ?? body.origin?.lng,
    });
  const destination =
    jobFromNested ||
    pointFromLocation({
      latitude: body.jobLatitude ?? body.clientLatitude ?? body.destination?.latitude ?? body.destination?.lat,
      longitude:
        body.jobLongitude ?? body.clientLongitude ?? body.destination?.longitude ?? body.destination?.lng,
    });

  if (!origin || !destination) {
    return null;
  }

  return { origin, destination };
}

async function findJob(routeId) {
  const filter = isMongoObjectId(routeId) ? { _id: routeId } : { id: routeId };
  return JobRequest.findOne(filter);
}

async function findLatestTracking(job) {
  const byJob = await WorkerTracking.findOne({ job_id: job._id }).sort({ timestamp: -1, _id: -1 });

  if (byJob) return byJob;
  if (!job.worker_id) return null;

  return WorkerTracking.findOne({ worker_id: job.worker_id }).sort({ timestamp: -1, _id: -1 });
}

function respondWithEta(res, origin, destination, options = {}) {
  const eta = buildEta(origin, destination, options);

  return res.json({
    estimated_minutes: eta.eta_minutes,
    eta_minutes: eta.eta_minutes,
    eta_label: eta.eta_label,
    distance_km: eta.distance_km,
    confidence: eta.confidence,
  });
}

// FYP: POST /api/eta — job location + worker location → estimated minutes
router.post("/", (req, res) => {
  const coordinates = coordinatesFromBody(req.body || {});

  if (!coordinates) {
    return res.status(400).json({
      error:
        "Provide jobLocation and workerLocation objects, or jobLatitude/jobLongitude and workerLatitude/workerLongitude",
    });
  }

  return respondWithEta(res, coordinates.origin, coordinates.destination, {
    hasLiveTracking: Boolean(req.body?.hasLiveTracking),
  });
});

router.post("/predict", (req, res) => {
  const coordinates = coordinatesFromBody(req.body || {});

  if (!coordinates) {
    return res.status(400).json({
      error:
        "Provide workerLatitude, workerLongitude, clientLatitude, and clientLongitude for ETA prediction",
    });
  }

  return respondWithEta(res, coordinates.origin, coordinates.destination, { hasLiveTracking: true });
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await findJob(req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const destination = {
      latitude: toNumber(job.latitude) ?? KARACHI_CENTER.latitude,
      longitude: toNumber(job.longitude) ?? KARACHI_CENTER.longitude,
    };
    const tracking = await findLatestTracking(job);
    const offset = deterministicOffset(String(job._id));
    const origin = tracking
      ? {
          latitude: tracking.latitude,
          longitude: tracking.longitude,
        }
      : {
          latitude: destination.latitude + offset.latitude,
          longitude: destination.longitude - offset.longitude,
        };

    const eta = buildEta(origin, destination, {
      hasLiveTracking: Boolean(tracking),
      pickupBufferMinutes: job.status === "in_progress" ? 0 : 4,
    });

    if (job.status === "completed") {
      eta.eta_minutes = 0;
      eta.eta_label = "Completed";
    } else if (job.status === "cancelled") {
      eta.eta_minutes = 0;
      eta.eta_label = "Cancelled";
    } else if (job.status === "in_progress") {
      eta.eta_label = "Arrived";
    }

    return res.json({
      job_id: job._id,
      public_job_id: job.id,
      status: job.status,
      ...eta,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
