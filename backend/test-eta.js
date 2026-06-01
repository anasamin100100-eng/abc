const workerLat = 24.8607;
const workerLng = 67.0011;
const jobLat = 24.8920;
const jobLng = 67.0747;

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const distance = getDistanceFromLatLonInKm(workerLat, workerLng, jobLat, jobLng);
const estimatedMinutes = Math.max(5, Math.round(distance * 2 + 5));

let etaText = estimatedMinutes < 60 
  ? `${estimatedMinutes} min` 
  : `${Math.floor(estimatedMinutes/60)} hr ${estimatedMinutes%60} min`;

console.log("ETA Predictor Test Result:");
console.log(JSON.stringify({
  success: true,
  distance: distance.toFixed(1),
  estimatedMinutes: estimatedMinutes,
  etaText: etaText
}, null, 2));
