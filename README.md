# MC Tunes

MC Tunes is a music discovery dashboard. Users authenticate, filter the catalog, receive Qdrant-powered recommendations, and save like/dislike feedback for personalized results.

## Current Features

### Authentication System
- Secure login page with username/password authentication
- MySQL-backed user registration and authentication
- Error handling and loading states
- Test accounts available for development

### User Interface
- Red and grey/black color scheme for visual appeal
- Consistent styling across all components
- Loading states and error messages for better user experience

## Architecture

- React + Vite frontend on `http://localhost:5173`.
- Express + Sequelize API on `http://localhost:3000`.
- MySQL for users, permissions, ratings, feedback, and bug reports.
- Qdrant on `http://localhost:6333` for vector search and recommendations.
- Python utilities in `src/qdrant` for embedding ingestion and recommendation tests.
- Audio enrichment in `src/qdrant/audio_features.py` for rhythm, melody, timbre, energy, and key descriptors.

## Project Structure
```
src/
├── assets/
│   └── mc_tunes_logo.png
├── components/
│   └── login.jsx       # Login component with authentication
│   └── login.css       # Login component styles
├── services/            # API clients and authentication helpers
│   └── services/            # API clients and authentication helpers
├── App.jsx            # Main application component
├── App.css           # Main application styles
└── index.css         # Global styles and variables
```

## Running the Project
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start MySQL from `database`:
   ```powershell
   cd database
   docker compose up -d
   ```
3. Start the API from the repository root:
   ```powershell
   npm run start
   ```
4. Start the frontend in a second terminal:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173`.

## Main API routes

- `POST /login` authenticates a user and returns an expiring bearer token.
- `POST /register` creates a user; passwords are hashed by the backend.
- `GET /recommendations` returns filter-based Qdrant results.
- `GET /recommendations/with-feedback` uses saved ratings when possible.
- Both recommendation routes accept optional `tempo`, `energy`, and `key` preferences when enriched audio payloads are available; the frontend exposes these controls.
- `POST /ratings` saves `rating: 1` for like or `rating: 0` for dislike.
- `POST /feedback` and `POST /bugreports` accept user-submitted reports.

The project is currently local-development software. Before production deployment, authentication, secrets, authorization, API validation, observability, and deployment configuration should be hardened.

## Production checklist

- Set a unique `AUTH_SECRET` and database password through a secret manager.
- Run MySQL and Qdrant on private networks; expose only the frontend/API gateway.
- Enrich Qdrant points with `python -m src.qdrant.ingest_audio_features <audio-directory> --dry-run` before writing audio features.
- Put the API behind HTTPS and configure the allowed frontend origin explicitly.
- Add a managed database backup and migration process.
- Monitor API errors, Qdrant availability, database health, and rate-limit events.
- Run `npm run lint`, `npm run build`, and the Python Qdrant tests in CI before deployment.

## Tech Stack
- React
- Vite
- CSS
- JavaScript
