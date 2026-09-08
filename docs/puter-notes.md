# Puter Notes (archived reference)

Puter was the original backend for Roomify and is **no longer wired into the app**.
The in-house backend (`server/` + `lib/api.ts`) replaced it completely.

This file preserves the old Puter implementation in one place in case it is ever
needed again (e.g. as a fallback, for migration reference, or to re-enable
Puter auth/storage/AI).

## What Puter provided

- **Auth** — one-click sign-in/sign-up via `puter.auth` (popup, no passwords)
- **Storage** — per-user KV store for projects (`roomify_project_<userId>_<id>`)
- **File hosting** — floor-plan/render images written to Puter FS and served from
  `*.puter.site` subdomains (subdomain cached in KV under `roomify_hosting_config`)
- **Backend** — `lib/puter.worker.js` deployed as a Puter Worker exposing
  `POST /api/projects/save`, `GET /api/projects/list`, `GET /api/projects/get?id=`
- **AI** — `puter.ai.txt2img()` with Gemini image models

## Env var it needed

```env
VITE_PUTER_WORKER_URL=https://your-worker.puter.work
```

The old dispatcher logic was: if `VITE_API_URL` is set, use the in-house backend;
otherwise fall back to Puter. The Puter SDK (`@heyputer/puter.js`) was lazy-loaded
via dynamic `import()` so its consent popup only appeared on the fallback path.

## `lib/puter.action.ts` (dispatcher + Puter fallback)

```ts
import {
  createProject as inHouseCreateProject,
  getCurrentUser as inHouseGetCurrentUser,
  getProjectById as inHouseGetProjectById,
  getProjects as inHouseGetProjects,
  getStoredUser,
  isInHouseConfigured,
  logout as inHouseLogout,
  requireAuthModal,
} from "./api";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";

export type AuthUser = {
  userName: string | null;
  userId: string | null;
};

const readString = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : null;

const isInHouse = () => isInHouseConfigured();

export const signIn = async () => {
  if (isInHouse()) {
    requireAuthModal();
    return false;
  }

  const puterModule = await import("@heyputer/puter.js");
  await puterModule.default.auth.signIn();
  return true;
};

export const signOut = async () => {
  if (isInHouse()) {
    await inHouseLogout();
    return true;
  }

  const puterModule = await import("@heyputer/puter.js");
  puterModule.default.auth.signOut();
  return true;
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  if (isInHouse()) {
    const user = await inHouseGetCurrentUser();
    return user ? { userName: user.name, userId: user.id } : null;
  }

  const puterModule = await import("@heyputer/puter.js");
  try {
    const user = (await puterModule.default.auth.getUser()) as {
      username?: unknown;
      uuid?: unknown;
    } | null;

    return user ? { userName: readString(user.username), userId: readString(user.uuid) } : null;
  } catch {
    return null;
  }
};

export const createProject = async ({
  item,
  visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
  if (isInHouse()) return inHouseCreateProject({ item, visibility });

  const puterModule = await import("@heyputer/puter.js");
  const puter = puterModule.default ?? puterModule;
  const hosting = await getOrCreateHostingConfig(puter);

  const hostedSource = item.id
    ? await uploadImageToHosting(puter, {
        hosting,
        url: item.sourceImage,
        projectId: item.id,
        label: "source",
      })
    : null;

  const hostedRender =
    item.id && item.renderedImage
      ? await uploadImageToHosting(puter, {
          hosting,
          url: item.renderedImage,
          projectId: item.id,
          label: "rendered",
        })
      : null;

  const resolvedSource =
    hostedSource?.url || (isHostedUrl(item.sourceImage) ? item.sourceImage : "");

  if (!resolvedSource) {
    console.warn("Failed to host source image, skipping save.");
    return null;
  }

  const resolvedRender = hostedRender?.url
    ? hostedRender.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  const payload = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  };

  try {
    const response = await puterModule.default.workers.exec(
      `${puterWorkerUrl()}/api/projects/save`,
      {
        method: "POST",
        body: JSON.stringify({ project: payload, visibility }),
      },
    );

    if (!response.ok) {
      console.error("Failed to save project:", await response.text());
      return null;
    }

    const data = (await response.json()) as { project?: DesignItem | null };
    return data?.project ?? null;
  } catch (error) {
    console.error("Failed to save project:", error);
    return null;
  }
};

export const getProjects = async (): Promise<DesignItem[]> => {
  if (isInHouse()) return inHouseGetProjects();

  try {
    const puterModule = await import("@heyputer/puter.js");
    const response = await puterModule.default.workers.exec(
      `${puterWorkerUrl()}/api/projects/list`,
      { method: "GET" },
    );

    if (!response.ok) {
      console.error("Failed to fetch projects:", await response.text());
      return [];
    }

    const data = (await response.json()) as { projects?: DesignItem[] | null };
    return Array.isArray(data?.projects) ? data.projects : [];
  } catch (error) {
    console.error("Failed to get projects:", error);
    return [];
  }
};

export const getProjectById = async ({ id }: { id: string }) => {
  if (isInHouse()) return inHouseGetProjectById({ id });

  try {
    const puterModule = await import("@heyputer/puter.js");
    const response = await puterModule.default.workers.exec(
      `${puterWorkerUrl()}/api/projects/get?id=${encodeURIComponent(id)}`,
      { method: "GET" },
    );

    if (!response.ok) {
      console.error("Failed to fetch project:", await response.text());
      return null;
    }

    const data = (await response.json()) as { project?: DesignItem | null };
    return data?.project ?? null;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
};

const puterWorkerUrl = () => {
  const url = (import.meta.env.VITE_PUTER_WORKER_URL as string | undefined) || "";
  if (!url) {
    console.warn("Missing VITE_PUTER_WORKER_URL; Puter fallback unavailable.");
  }
  return url;
};

export { getStoredUser };
```

## `lib/puter.hosting.ts` (Puter FS image hosting)

```ts
import type puter from "@heyputer/puter.js";
import {
  createHostingSlug,
  fetchBlobFromUrl,
  getHostedUrl,
  getImageExtension,
  HOSTING_CONFIG_KEY,
  imageUrlToPngBlob,
  isHostedUrl,
} from "./utils";

type PuterClient = typeof puter;

export const getOrCreateHostingConfig = async (
  puter: PuterClient,
): Promise<HostingConfig | null> => {
  const existing = (await puter.kv.get(HOSTING_CONFIG_KEY)) as HostingConfig | null;

  if (existing?.subdomain) return { subdomain: existing.subdomain };

  const subdomain = createHostingSlug();

  try {
    const created = await puter.hosting.create(subdomain, ".");

    // Store the subdomain in kv, otherwise it will create it every single time which can lead to hitting limits and increased costs
    const record = { subdomain: created.subdomain };
    await puter.kv.set(HOSTING_CONFIG_KEY, record);

    return record;
  } catch (e) {
    console.warn(`Could not find subdomain: ${e}`);
    return null;
  }
};

export const uploadImageToHosting = async (
  puter: PuterClient,
  { hosting, url, projectId, label }: StoreHostedImageParams,
): Promise<HostedAsset | null> => {
  if (!hosting || !url) return null;
  if (isHostedUrl(url)) return { url };

  try {
    const resolved =
      label === "rendered"
        ? await imageUrlToPngBlob(url).then((blob) =>
            blob ? { blob, contentType: "image/png" } : null,
          )
        : await fetchBlobFromUrl(url);

    if (!resolved) return null;

    const contentType = resolved.contentType || resolved.blob.type || "";
    const ext = getImageExtension(contentType, url);
    const dir = `projects/${projectId}`;
    const filePath = `${dir}/${label}.${ext}`;

    const uploadFile = new File([resolved.blob], `${label}.${ext}`, { type: contentType });

    await puter.fs.mkdir(dir, { createMissingParents: true });
    await puter.fs.write(filePath, uploadFile);

    const hostedUrl = getHostedUrl({ subdomain: hosting.subdomain }, filePath);

    return hostedUrl ? { url: hostedUrl } : null;
  } catch (e) {
    console.warn(`Failed to store hosted image: ${e}`);
    return null;
  }
};
```

## `lib/ai.action.ts` (Puter AI branch)

The in-house path called the API; the Puter fallback called Gemini through Puter:

```ts
import { fetchAsDataUrl } from "./utils";
import { ROOMIFY_RENDER_PROMPT } from "./constants";
import { isInHouseConfigured, generate3DView as inHouseGenerate3DView } from "./api";

export const generate3DView = async ({
  sourceImage,
}: Generate3DViewParams): Promise<Generate3DViewResult> => {
  // Prefer the in-house backend when configured.
  if (isInHouseConfigured()) return inHouseGenerate3DView({ sourceImage });

  // Fallback: Puter AI via Gemini.
  const puterModule = await import("@heyputer/puter.js");
  const puter = puterModule.default ?? puterModule;

  const dataUrl = sourceImage.startsWith("data:") ? sourceImage : await fetchAsDataUrl(sourceImage);

  const base64Data = dataUrl.split(",")[1];
  const mimeType = dataUrl.split(";")[0].split(":")[1];

  if (!mimeType || !base64Data) throw new Error("Invalid source image payload");

  const response = (await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
    provider: "gemini",
    model: "gemini-2.5-flash-image",
    input_image: base64Data,
    input_image_mime_type: mimeType,
    ratio: { w: 1024, h: 1024 },
  })) as HTMLImageElement;

  const rawImageUrl = response.src ?? null;

  if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

  const renderedImage = rawImageUrl.startsWith("data")
    ? rawImageUrl
    : await fetchAsDataUrl(rawImageUrl);

  return { renderedImage, renderedPath: undefined };
};
```

## `lib/puter.worker.js` (Puter Worker backend)

Deploy this file as a [Puter Worker](https://docs.puter.com/). It exposed:

- `POST /api/projects/save` — save a project
- `GET /api/projects/list` — list all user projects
- `GET /api/projects/get?id=` — get a project by ID

```js
const PROJECT_PREFIX = "roomify_project_";

const jsonError = (status, message, extra = {}) => {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

const getUserId = async (userPuter) => {
  try {
    const user = await userPuter.auth.getUser();

    return user?.uuid || null;
  } catch {
    return null;
  }
};

router.post("/api/projects/save", async ({ request, user }) => {
  try {
    const userPuter = user.puter;

    if (!userPuter) return jsonError(401, "Authentication failed");

    const body = await request.json();
    const project = body?.project;

    if (!project?.id || !project?.sourceImage)
      return jsonError(400, "Project ID and source image are required");

    const payload = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, "Authentication failed");

    const key = `${PROJECT_PREFIX}${userId}_${project.id}`;

    await userPuter.kv.set(key, payload);

    return { saved: true, id: project.id, project: payload };
  } catch (e) {
    return jsonError(500, "Failed to save project", { message: e.message || "Unknown error" });
  }
});

router.get("/api/projects/list", async ({ user }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, "Authentication failed");

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, "Authentication failed");

    const projects = (await userPuter.kv.list(PROJECT_PREFIX, true)).map(({ value }) => ({
      ...value,
      isPublic: true,
    }));

    return { projects };
  } catch (e) {
    return jsonError(500, "Failed to list projects", { message: e.message || "Unknown error" });
  }
});

router.get("/api/projects/get", async ({ request, user }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, "Authentication failed");

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, "Authentication failed");

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) return jsonError(400, "Project ID is required");

    const key = `${PROJECT_PREFIX}${id}`;
    const project = await userPuter.kv.get(key);

    if (!project) return jsonError(404, "Project not found");

    return { project };
  } catch (e) {
    return jsonError(500, "Failed to get project", { message: e.message || "Unknown error" });
  }
});
```

## Supporting pieces that were removed with it

- `PUTER_WORKER_URL` env/constant and the `ROOMIFY_RENDER_PROMPT` frontend copy
  (the render prompt now lives server-side in `server/src/lib/ai.ts`).
- Puter-only `lib/utils.ts` helpers: `HOSTING_CONFIG_KEY`,
  `HOSTING_DOMAIN_SUFFIX`, `isHostedUrl`, `createHostingSlug`, `getHostedUrl`,
  `getImageExtension`, `dataUrlToBlob`, `fetchAsDataUrl`, `fetchBlobFromUrl`,
  `imageUrlToPngBlob`.
- Puter-only `type.d.ts` types: `HostingConfig`, `HostedAsset`,
  `StoreHostedImageParams`.
- The `@heyputer/puter.js` npm dependency (lazy-loaded via dynamic `import()`,
  so it only ever downloaded when the fallback path ran).

## How to re-enable (if ever needed)

1. `npm install @heyputer/puter.js`
2. Restore the four files above to `lib/`.
3. Set `VITE_PUTER_WORKER_URL` and deploy the worker file to Puter.
4. Re-introduce the dispatcher: use the in-house `lib/api.ts` when
   `VITE_API_URL` is set, otherwise fall back to the Puter functions above.
