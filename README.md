<p align="center">
  <img src="public/logo.svg" alt="Roomify" width="96" />
</p>

<h1 align="center">Roomify</h1>

<p align="center">
  AI-powered floor plan to 3D visualization. Upload a 2D floor plan and get a photorealistic top-down 3D render in seconds.
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#tech-stack">Tech Stack</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#project-structure">Structure</a> &middot;
  <a href="#deployment">Deployment</a>
</p>

---

## Features

- **In-house AI 3D Rendering** — Converts 2D floor plans into photorealistic top-down 3D renders through the Roomify API using the official Gemini API
- **Puter Fallback** — Keeps the original Puter AI, auth, storage, hosting, and worker implementation available when the in-house API is not configured
- **Email/Password Auth** — Self-hosted JWT authentication with bcrypt password hashing
- **Project Management** — Save, list, and revisit projects stored in Postgres
- **Image Hosting** — Uploaded and rendered images are persisted by the API and served from `/uploads`
- **Drag & Drop Upload** — Drop a floor plan image and get started instantly
- **Before / After Comparison** — Interactive slider compares the original plan with the AI render
- **Export** — Download rendered images as PNG
- **Docker Ready** — Frontend, API, and Postgres can run together with Docker Compose

## Tech Stack

| Layer            | Technology                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend         | [React Router 8](https://reactrouter.com/) with SSR                                                                                                          |
| Build            | [Vite 8](https://vitejs.dev/)                                                                                                                                |
| Styling          | [Tailwind CSS 4](https://tailwindcss.com/)                                                                                                                   |
| Language         | [TypeScript 7](https://www.typescriptlang.org/)                                                                                                              |
| Formatter        | [Prettier 3](https://prettier.io/)                                                                                                                           |
| API              | [Express 5](https://expressjs.com/) with TypeScript                                                                                                          |
| Database         | [Postgres](https://www.postgresql.org/) with [Prisma 7](https://www.prisma.io/)                                                                              |
| Auth             | Email/password, bcrypt, and JWT                                                                                                                              |
| AI               | [Gemini image models](https://ai.google.dev/) via the [Vercel AI SDK](https://sdk.vercel.ai/) (`ai` + `@ai-sdk/google`), switchable through `AI_IMAGE_MODEL` |
| Fallback backend | [Puter.js](https://docs.puter.com/)                                                                                                                          |
| Icons            | [Lucide React](https://lucide.dev/)                                                                                                                          |
| Comparison       | [React Compare Slider](https://github.com/nicolo-ribaudo/react-compare-slider)                                                                               |

## Getting Started

### Prerequisites

- Node.js 22 or later
- npm
- Postgres, or Docker Compose
- A Gemini API key for AI rendering

### 1. Install dependencies

```bash
npm install
cd server
npm install
cd ..
```

### 2. Configure the frontend

Copy the example environment file:

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:4000
VITE_PUTER_WORKER_URL=https://your-worker.puter.work
```

If `VITE_API_URL` is set, the app uses the in-house backend. If it is empty, the app falls back to Puter.

### 3. Configure the API

```bash
cp server/.env.example server/.env
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"
GEMINI_API_KEY="replace-with-your-gemini-api-key"
AI_IMAGE_MODEL="gemini-2.5-flash-image"
PUBLIC_URL="http://localhost:4000"
UPLOAD_DIR="uploads"
PORT=4000
```

Never commit real values from `.env` or `server/.env`.

### 4. Prepare the database

```bash
cd server
npm run db:generate
npm run db:push
cd ..
```

### 5. Run the app

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- API health check: `http://localhost:4000/health`

### Checks

```bash
npm run typecheck
npm run build
cd server
npm run build
cd ..
npm run format:check
```

## API Reference

All project and AI routes require a JWT in the `Authorization: Bearer <token>` header.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Projects

- `POST /api/projects/save`
- `GET /api/projects/list`
- `GET /api/projects/get?id=<project-id>`

Projects are scoped to the authenticated owner. Base64 source and rendered images are stored under `uploads/projects/<project-id>/` and returned as public URLs.

### AI

- `GET /api/ai/models`
- `POST /api/ai/render`

Accepts a floor-plan source image as a data URL or URL and returns a Gemini-generated rendered image.

Rendering goes through the Vercel AI SDK (`generateText` with `responseModalities: ["TEXT", "IMAGE"]`). Available models live in the registry in `server/src/lib/models.ts`. Switch models by setting `AI_IMAGE_MODEL` (for example `gemini-3.1-flash-image` or `gemini-3-pro-image`), or pass an optional `model` in the render request body.

## Project Structure

```
roomify/
├── app/
│   ├── root.tsx                     # Root layout and auth provider
│   ├── routes.ts                    # Route definitions
│   ├── routes/
│   │   ├── home.tsx                 # Homepage: hero, upload, project grid
│   │   └── visualizer.$id.tsx       # Visualizer: render, compare, export
│   └── app.css                      # Global styles
├── components/
│   ├── AuthModal.tsx                # In-house login/register modal
│   ├── Navbar.tsx                   # Top navigation bar
│   ├── Upload.tsx                   # Drag-and-drop upload with progress
│   └── ui/
│       └── Button.tsx               # Reusable button component
├── lib/
│   ├── ai.action.ts                 # In-house AI call with Puter fallback
│   ├── api.ts                       # In-house REST and token client
│   ├── constants.ts                 # Backend, storage, timing, and prompt constants
│   ├── puter.action.ts              # Backend dispatcher and Puter fallback
│   ├── puter.hosting.ts             # Puter image hosting fallback
│   ├── puter.worker.js              # Legacy Puter worker implementation
│   └── utils.ts                     # Image conversion and URL helpers
├── server/
│   ├── src/
│   │   ├── index.ts                 # Express app entry point
│   │   ├── config.ts                # Environment configuration
│   │   ├── db.ts                    # Prisma client with Postgres adapter
│   │   ├── lib/
│   │   │   ├── ai.ts                # Vercel AI SDK render integration
│   │   │   ├── models.ts            # Switchable image-model registry
│   │   │   ├── jwt.ts               # Token signing and verification
│   │   │   ├── password.ts          # Password hashing
│   │   │   └── storage.ts           # Image persistence and public URLs
│   │   ├── middleware/
│   │   │   └── auth.ts              # JWT request authentication
│   │   └── routes/
│   │       ├── auth.ts              # Register, login, current user, logout
│   │       ├── projects.ts          # Save, list, and retrieve projects
│   │       └── render.ts            # AI render endpoint
│   ├── prisma/
│   │   └── schema.prisma            # User and Project models
│   ├── Dockerfile                   # API production image
│   └── package.json                 # API dependencies and scripts
├── docker-compose.yml               # Frontend, API, and Postgres
├── Dockerfile                       # Frontend production image
├── type.d.ts                        # Shared TypeScript interfaces
└── README.md
```

## How It Works

1. **Sign in** — Users create an account or sign in through the in-house auth modal. Puter sign-in remains available when the API URL is not configured.
2. **Upload** — A 2D floor plan is uploaded from the homepage.
3. **Store** — The API persists the source image and stores the project in Postgres.
4. **Render** — The visualizer calls `/api/ai/render`, which sends the plan and architectural prompt to Gemini and returns a rendered image.
5. **Compare** — The original plan and AI render are displayed with an interactive comparison slider.
6. **Export** — Users can download the rendered image as PNG.

## Deployment

### Docker Compose

The recommended local production-like deployment runs the frontend, API, and Postgres together:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`

For browser access from another host, set `PUBLIC_URL` and `VITE_API_URL` to the publicly reachable API address. Set a strong `JWT_SECRET` outside local development.

### Frontend Docker image

```bash
docker build -t roomify .
docker run -p 3000:3000 roomify
```

Use build arguments to configure backend endpoints:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_PUTER_WORKER_URL=https://your-worker.puter.work \
  -t roomify .
```

### API Docker image

```bash
docker build -t roomify-api ./server
```

The API image generates the Prisma client during the build and synchronizes the database schema before starting.

### Puter fallback

The legacy Puter worker remains in `lib/puter.worker.js`. Deploy it to Puter and configure `VITE_PUTER_WORKER_URL` if you want the original Puter auth, storage, hosting, worker, and AI path instead of the in-house backend.

## License

MIT
