# Roomify

AI-powered floor plan to 3D visualization. Upload a 2D floor plan and get a photorealistic top-down 3D render in seconds — fully in-house, no external SaaS backend.

## Features

- **In-house AI 3D Rendering** — Converts 2D floor plans into photorealistic top-down 3D renders using the official Gemini API via the Vercel AI SDK
- **Email/Password Auth** — Self-hosted JWT authentication with bcrypt password hashing
- **Project Management** — Save, list, and revisit projects stored in Postgres
- **Image Hosting** — Uploaded and rendered images are persisted locally and served from `/uploads`
- **Drag & Drop Upload** — Drop a floor plan image and get started instantly
- **Before / After Comparison** — Interactive slider compares the original plan with the AI render
- **Export** — Download rendered images as PNG
- **Docker Ready** — The app and Postgres can run together with Docker Compose

## Tech Stack

| Layer      | Technology                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework  | [Next.js 16](https://nextjs.org/) (App Router, server & client components)                                                                                   |
| Styling    | [Tailwind CSS 4](https://tailwindcss.com/)                                                                                                                   |
| Language   | [TypeScript](https://www.typescriptlang.org/)                                                                                                                |
| Package    | [Bun](https://bun.sh/)                                                                                                                                       |
| API        | Next.js [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)                                                                         |
| Database   | [Postgres](https://www.postgresql.org/) with [Prisma 7](https://www.prisma.io/) + `@prisma/adapter-pg`                                                       |
| Auth       | Email/password, bcrypt, and JWT                                                                                                                              |
| AI         | [Gemini image models](https://ai.google.dev/) via the [Vercel AI SDK](https://sdk.vercel.ai/) (`ai` + `@ai-sdk/google`), switchable through `AI_IMAGE_MODEL` |
| Icons      | [Lucide React](https://lucide.dev/)                                                                                                                          |
| Comparison | [React Compare Slider](https://github.com/nicolo-ribaudo/react-compare-slider)                                                                               |

## Getting Started

### Prerequisites

- Node.js 20+ or [Bun](https://bun.sh/)
- Postgres, or Docker Compose
- A Gemini API key for AI rendering

### 1. Install dependencies

```bash
bun install
```

### 2. Configure the environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"
GEMINI_API_KEY="replace-with-your-gemini-api-key"
AI_IMAGE_MODEL="gemini-2.5-flash-image"
PUBLIC_URL="http://localhost:3000"
UPLOAD_DIR="uploads"
```

Never commit real values from `.env.local`.

### 3. Prepare the database

```bash
bun run db:generate
bun run db:push
```

### 4. Run the app

```bash
bun run dev
```

- App and API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

### Checks

```bash
bun run lint
bun run build
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

Projects are scoped to the authenticated owner. Base64 source and rendered images are stored under `uploads/projects/<project-id>/` and returned as public URLs served by `/uploads/...`.

### AI

- `GET /api/ai/models`
- `POST /api/ai/render`

Accepts a floor-plan source image as a data URL or URL and returns a Gemini-generated rendered image.

Rendering goes through the Vercel AI SDK (`generateText` with `responseModalities: ["TEXT", "IMAGE"]`). Available models live in the registry in `src/lib/models.ts`. Switch models by setting `AI_IMAGE_MODEL` (for example `gemini-3.1-flash-image` or `gemini-3-pro-image`), or pass an optional `model` in the render request body.

## Project Structure

```
roomify/
├── prisma/
│   └── schema.prisma              # User and Project models
├── prisma.config.ts               # Prisma CLI configuration
├── src/
│   ├── app/
│   │   ├── api/                   # Route handlers (in-house backend)
│   │   │   ├── auth/              # register, login, me, logout
│   │   │   ├── projects/          # save, list, get
│   │   │   ├── ai/                # render, models
│   │   │   ├── uploads/[...path]  # Serves stored images
│   │   │   └── health/
│   │   ├── visualizer/[id]/       # Visualizer: render, compare, export
│   │   ├── layout.tsx             # Root layout, fonts, auth provider
│   │   ├── page.tsx               # Homepage: hero, upload, project grid
│   │   ├── globals.css            # Tailwind theme and component styles
│   │   └── icon.svg               # Roomify favicon
│   ├── components/
│   │   ├── AuthModal.tsx          # In-house login/register modal
│   │   ├── AuthProvider.tsx       # Auth state context
│   │   ├── AuthModalHost.tsx      # Global auth modal host
│   │   ├── Navbar.tsx             # Top navigation bar
│   │   ├── Upload.tsx             # Drag-and-drop upload with progress
│   │   └── ui/Button.tsx          # Reusable button component
│   └── lib/
│       ├── api.ts                 # Backend REST client, auth, and AI calls
│       ├── auth.ts                # JWT request authentication
│       ├── config.ts              # Environment configuration
│       ├── ai.ts                  # Vercel AI SDK render integration
│       ├── models.ts              # Switchable image-model registry
│       ├── jwt.ts                 # Token signing and verification
│       ├── password.ts            # Password hashing
│       ├── storage.ts             # Image persistence and public URLs
│       ├── db.ts                  # Prisma client with Postgres adapter
│       ├── constants.ts           # Storage and timing constants
│       └── types.ts               # Shared TypeScript interfaces
├── docs/
│   └── puter-notes.md             # Archived Puter implementation (reference only)
├── docker-compose.yml             # Postgres + Next.js app
├── Dockerfile                     # Production image
└── README.md
```

## How It Works

1. **Sign in** — Users create an account or sign in through the auth modal.
2. **Upload** — A 2D floor plan is uploaded from the homepage.
3. **Store** — The API persists the source image and stores the project in Postgres.
4. **Render** — The visualizer calls `/api/ai/render`, which sends the plan and architectural prompt to Gemini and returns a rendered image.
5. **Compare** — The original plan and AI render are displayed with an interactive comparison slider.
6. **Export** — Users can download the rendered image as PNG.

## Deployment

### Docker Compose

The recommended local production-like deployment runs the app and Postgres together:

```bash
docker compose up --build
```

- App and API: `http://localhost:3000`

For browser access from another host, set `PUBLIC_URL` to the publicly reachable address of the app. Set a strong `JWT_SECRET` outside local development.

### Single Docker image

```bash
docker build -t roomify .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/roomify \
  -e JWT_SECRET=replace-with-a-long-random-secret \
  -e GEMINI_API_KEY=replace-with-your-gemini-api-key \
  -v roomify-uploads:/app/uploads \
  roomify
```

The image generates the Prisma client during the build and synchronizes the database schema before starting.

## Archived Puter implementation

The original Puter-based backend (auth, storage, hosting, worker, AI) is no longer wired into the app. Its code is preserved for reference in `docs/puter-notes.md`.

## License

MIT
