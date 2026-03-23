# BFit Backend

Express + MongoDB + Socket.IO server for the **BFit AI-Powered Fitness Assistant** Angular frontend.

---

## Tech Stack

| Layer       | Library              | Purpose                                      |
|-------------|----------------------|----------------------------------------------|
| HTTP server | Express 4            | REST API + static file serving               |
| Database    | MongoDB + Mongoose 8 | Persistent storage for profiles & daily data |
| Realtime    | Socket.IO 4          | Live presence & workout feed                 |
| AI proxy    | Node `fetch`         | Server-side Gemini API calls                 |
| Security    | Helmet, CORS, rate-limit | Production hardening                    |

---

## Folder Structure

```
bfit-backend/
├── server.js              ← entry point
├── package.json
├── .env.example
├── config/
│   └── db.js              ← Mongoose connection
├── models/
│   ├── User.js            ← UserProfileData (mirrors frontend interface)
│   └── DailyData.js       ← DailyStats + Workouts + Meals
├── routes/
│   ├── profile.js         ← GET/PUT  /api/profile
│   ├── daily.js           ← All per-date CRUD
│   └── ai.js              ← Gemini proxy routes
└── middleware/
    └── errorHandler.js    ← Centralised error responses
```

---

## Quick Start

### 1. Install dependencies

```bash
cd bfit-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# then edit .env and fill in real values
```

| Variable          | Required | Description                                     |
|-------------------|----------|-------------------------------------------------|
| `PORT`            | no       | HTTP port (default `3000`)                      |
| `MONGODB_URI`     | **yes**  | `mongodb://localhost:27017/bfit` or Atlas URI   |
| `GEMINI_API_KEY`  | **yes**  | Your Google AI Studio API key                   |
| `ALLOWED_ORIGINS` | no       | Comma-separated CORS origins (default: `*`)     |

### 3. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

---

## API Reference

### Profile

| Method | Path           | Body                  | Returns              |
|--------|----------------|-----------------------|----------------------|
| GET    | `/api/profile` | —                     | `UserProfileData`    |
| PUT    | `/api/profile` | Partial profile fields| Updated profile      |

### Daily Data

| Method | Path                                   | Body / Notes                          |
|--------|----------------------------------------|---------------------------------------|
| GET    | `/api/daily/history`                   | Returns `string[]` of YYYY-MM-DD dates|
| GET    | `/api/daily/:date`                     | Full day object or default empty      |
| PATCH  | `/api/daily/:date/stats`               | Partial `DailyStats` object           |
| POST   | `/api/daily/:date/workouts`            | `{ name, duration?, calories?, exercises?[], completed? }` |
| PATCH  | `/api/daily/:date/workouts/:id/toggle` | Toggles `completed` flag              |
| DELETE | `/api/daily/:date/workouts/:id`        | Removes workout                       |
| POST   | `/api/daily/:date/meals`               | `{ name, calories?, protein?, carbs?, fat? }` |
| DELETE | `/api/daily/:date/meals/:id`           | Removes meal + adjusts stats          |
| PUT    | `/api/daily/:date/meals`              | `{ meals: Meal[] }` — full replace    |

All `:date` params must be **YYYY-MM-DD** format.

### AI Proxy

All routes call the Gemini API server-side; no API key is exposed to the browser.

| Method | Path                          | Body                                              | Returns                    |
|--------|-------------------------------|---------------------------------------------------|----------------------------|
| POST   | `/api/ai/chat`                | `{ prompt, systemInstruction? }`                 | `{ text }`                 |
| POST   | `/api/ai/workout-plan`        | `{ goals, profile: {age,height,weight} }`        | `{ text }`                 |
| POST   | `/api/ai/workout-structured`  | `{ profile: UserProfileData, goals }`            | `{ exercises: AIExercise[] }` |
| POST   | `/api/ai/nutrition`           | `{ mealLog, profile: UserProfile }`              | `{ advice, itemsToRemove }` |
| POST   | `/api/ai/meal-photo`          | `{ base64Image, mimeType? }`                     | `MealAnalysis`             |
| POST   | `/api/ai/posture`             | `{ base64Image, mimeType? }`                     | `PostureAnalysis`          |
| POST   | `/api/ai/exercise-guide`      | `{ exerciseName, workoutDetails? }`              | `ExerciseGuide`            |

### Other

| Method | Path           | Description              |
|--------|----------------|--------------------------|
| GET    | `/api/health`  | Health-check (uptime etc)|

---

## Socket.IO Events

The server mirrors exactly what `realtimeService.ts` expects.

### Server → All clients

| Event          | Payload                  | Trigger                          |
|----------------|--------------------------|----------------------------------|
| `presence`     | `{ count: number }`      | On every connect / disconnect    |

### Client → Server (relayed to others)

| Event            | Payload                                            |
|------------------|----------------------------------------------------|
| `workout:update` | `{ type, count?, exercise? }` — relayed via broadcast |

---

## Connecting the Angular Frontend

The Angular `DataService` currently stores everything in `localStorage`. To switch it to the backend API, update `DataService` to use Angular's `HttpClient` targeting `http://localhost:3000/api`.

### Minimal `DataService` pattern

```typescript
// src/app/data.ts  (suggested additions — no existing code removed)
import { HttpClient } from '@angular/common/http';

private http = inject(HttpClient);
private API  = 'http://localhost:3000/api';

// Replace loadFromStorage() with:
loadProfile() {
  return this.http.get<UserProfileData>(`${this.API}/profile`);
}
updateProfile(profile: UserProfileData) {
  return this.http.put<UserProfileData>(`${this.API}/profile`, profile);
}
getDayData(date: string) {
  return this.http.get(`${this.API}/daily/${date}`);
}
// ... and so on for each method
```

In **development**, the Angular dev-server proxy (`proxy.conf.json`) can forward `/api/*` to `localhost:3000` so no CORS headers are needed:

```json
{
  "/api": { "target": "http://localhost:3000", "secure": false }
}
```

---

## Production Deployment

1. Build the Angular app:
   ```bash
   cd bfit_frontend
   ng build --configuration production
   ```
2. Copy `dist/bfit/browser/` into `bfit-backend/public/`.
3. Set `NODE_ENV=production` and a real `MONGODB_URI` (e.g., MongoDB Atlas).
4. Start with `npm start` (or use PM2 / Docker).

The Express server will serve the Angular SPA from `/public` and fall back to `index.html` for all non-API routes.
