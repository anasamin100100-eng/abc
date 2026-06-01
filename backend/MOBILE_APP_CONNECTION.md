# UstadGo Mobile App Backend Connection

Use the same Node/Express backend for the admin portal and the Kotlin mobile apps.

## Base URL

Choose one base URL depending on where the mobile app is running:

- Android emulator: `http://10.0.2.2:5001/api`
- Real phone on same Wi-Fi: `http://YOUR_LAPTOP_IPV4:5001/api`
- Deployed backend: `https://your-backend-domain.com/api`

To find the laptop IPv4 on Windows:

```powershell
ipconfig
```

Use the Wi-Fi adapter IPv4 address, for example:

```text
http://192.168.1.8:5001/api
```

`localhost` only works inside the same laptop. A real phone cannot use laptop `localhost`.

## ETA Prediction API

For direct coordinate-based ETA prediction:

```http
POST /eta/predict
Content-Type: application/json

{
  "workerLatitude": 24.8707,
  "workerLongitude": 67.0111,
  "clientLatitude": 24.8607,
  "clientLongitude": 67.0011
}
```

For ETA by existing job:

```http
GET /eta/jobs/JOB_MONGO_ID_OR_PUBLIC_JOB_ID
```

Example response:

```json
{
  "eta_minutes": 11,
  "eta_label": "11 mins",
  "distance_km": 3.2,
  "confidence": 82
}
```

## Kotlin Retrofit Example

```kotlin
interface UstadGoApi {
    @POST("eta/predict")
    suspend fun predictEta(@Body body: EtaRequest): EtaResponse
}

data class EtaRequest(
    val workerLatitude: Double,
    val workerLongitude: Double,
    val clientLatitude: Double,
    val clientLongitude: Double
)

data class EtaResponse(
    val eta_minutes: Int,
    val eta_label: String,
    val distance_km: Double,
    val confidence: Int
)
```

Admin portal APIs are admin-token protected. Client and worker mobile authentication should use a separate client/worker JWT flow when the mobile app starts.
