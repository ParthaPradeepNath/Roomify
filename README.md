<p align="center">
  <img src="public/favicon.ico" alt="Roomify" width="48" />
</p>

<h1 align="center">Roomify</h1>

<p align="center">
  AI-powered floor plan to 3D visualization. Upload a 2D floor plan and get a photorealistic top-down 3D render in seconds.
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#demo">Demo</a> &middot;
  <a href="#tech-stack">Tech Stack</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#project-structure">Structure</a> &middot;
  <a href="#deployment">Deployment</a>
</p>

---

## Features

- **AI 3D Rendering** — Converts 2D floor plans into photorealistic top-down 3D architectural renders using Gemini 2.5 Flash
- **Drag & Drop Upload** — Drop a floor plan image (JPG, PNG, WebP) and get started instantly
- **Before / After Comparison** — Interactive slider to compare the original plan with the AI render
- **Project Management** — Save, list, and revisit past projects via Puter cloud storage
- **Image Hosting** — Rendered images are hosted on Puter hosting with persistent URLs
- **Authentication** — One-click sign-in/sign-up powered by Puter Auth
- **Export** — Download rendered images as PNG
- **Docker Ready** — Multi-stage Dockerfile for production deployment

## Demo

Upload a floor plan on the homepage, and the visualizer will automatically generate a 3D render. Drag the comparison slider to see the transformation.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React Router v7](https://reactrouter.com/) (SSR) |
| Build | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| AI | [Gemini 2.5 Flash](https://ai.google.dev/) via [Puter.js](https://docs.puter.com/) |
| Auth & Storage | [Puter](https://puter.com/) (Auth, KV, FS, Hosting) |
| Icons | [Lucide React](https://lucide.dev/) |
| Comparison | [React Compare Slider](https://github.com/nicolo-ribaudo/react-compare-slider) |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- A [Puter](https://puter.com/) account (for auth, storage, and AI)

### Installation

```bash
git clone https://github.com/ParthaPradeepNath/roomify.git
cd roomify
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_PUTER_WORKER_URL=https://your-worker.puter.work
```

> The Puter worker handles project CRUD operations. See `lib/puter.worker.js` for the worker code to deploy on [Puter](https://docs.puter.com/).

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Type Check

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

Serves the built app on `http://localhost:3000`.

## Project Structure

```
roomify/
├── app/
│   ├── root.tsx                     # Root layout, auth provider
│   ├── routes.ts                    # Route definitions
│   ├── routes/
│   │   ├── home.tsx                 # Homepage: hero, upload, project grid
│   │   └── visualizer.$id.tsx       # Visualizer: render, compare, export
│   └── app.css                      # Global styles (Tailwind + component layers)
├── components/
│   ├── Navbar.tsx                   # Top navigation bar
│   ├── Upload.tsx                   # Drag & drop file upload with progress
│   └── ui/
│       └── Button.tsx               # Reusable button component
├── lib/
│   ├── ai.action.ts                 # Gemini AI rendering (txt2img)
│   ├── constants.ts                 # Prompt, paths, timing constants
│   ├── puter.action.ts              # Puter: auth, project CRUD
│   ├── puter.hosting.ts             # Puter: hosting & image upload
│   ├── puter.worker.js              # Puter worker (deploy separately)
│   └── utils.ts                     # Image conversion, URL helpers
├── type.d.ts                        # Shared TypeScript interfaces
├── Dockerfile                       # Multi-stage Docker build
├── package.json
├── tsconfig.json
├── vite.config.ts
└── react-router.config.ts
```

## How It Works

1. **Upload** — User uploads a 2D floor plan image via the drag-and-drop uploader
2. **Store** — The image is saved to Puter File System under the project directory
3. **Render** — The AI action calls `puter.ai.txt2img()` with a detailed architectural prompt and the floor plan as input, using Gemini 2.5 Flash to generate a 1024x1024 photorealistic top-down 3D render
4. **Compare** — The visualizer shows the original plan and the AI render side-by-side with an interactive comparison slider
5. **Export** — Users can download the rendered image as PNG

## Deployment

### Docker

```bash
docker build -t roomify .
docker run -p 3000:3000 roomify
```

The multi-stage Dockerfile builds a minimal production image with only runtime dependencies.

### Puter Worker

The backend logic runs as a [Puter Worker](https://docs.puter.com/) (`lib/puter.worker.js`). Deploy it to Puter and set the `VITE_PUTER_WORKER_URL` environment variable to point to your worker URL.

The worker exposes:
- `POST /api/projects/save` — Save a project
- `GET /api/projects/list` — List all user projects
- `GET /api/projects/get?id=` — Get a project by ID

### Manual

Deploy the output of `npm run build` to any Node.js hosting:

```
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

Supported platforms: AWS ECS, Google Cloud Run, Azure Container Apps, Fly.io, Railway, DigitalOcean App Platform.

## License

MIT
