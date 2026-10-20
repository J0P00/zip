# OOP Pedagogical Hub

This project is a React/TypeScript learning hub with an Express/PostgreSQL backend.

## Architecture

- `src/App.tsx` owns application routing, session state, and cross-feature orchestration.
- `src/components/` contains the student, teacher, admin, and shared UI surfaces.
- `src/data/` contains local course/demo data and browser-backed progress stores.
- `src/services/api.ts` is the frontend API boundary; `src/services/identity.ts` provides canonical student identity matching.
- `src/services/interpretation.ts` and `src/services/recommendationEngine.ts` contain the rule-based learning engines.
- `backend/server.js` is the active Express API and PostgreSQL integration; `backend/oop_course_schema.sql` defines the database schema.

### Temporary local video uploads

Teacher video uploads are sent as `multipart/form-data` to the Render backend and stored under `backend/uploads/videos` by default. Only MP4 files up to 25 MB are accepted. The maximum can be changed on the backend with `LOCAL_VIDEO_MAX_BYTES`; the storage directory can be changed with `LOCAL_VIDEO_DIR`.

This is demonstration storage only. Render's default filesystem is ephemeral, so uploaded videos may disappear after restarts, redeployments, or instance replacement. No AWS S3, Cloudinary, or Supabase credentials are required for this flow.

Student monitoring uses the selected student's canonical `id`, falling back to `userId` and then email. The backend resolves that value to `users.id` before querying progress and assessment data.

## Run Locally

Prerequisites: Node.js and PostgreSQL for backend-backed features.

1. Install frontend dependencies with `npm install`.
2. Set frontend values in `.env` or `.env.local` as needed, especially `VITE_API_BASE_URL`.
3. Run the frontend with `npm run dev`.
4. Install backend dependencies in `backend/` and configure `backend/.env` from `backend/.env.example`.
5. Run the backend with `npm start` from `backend/`.

## Validation

- `npm run lint` runs the TypeScript check.
- `npm run build` creates the production frontend bundle.
