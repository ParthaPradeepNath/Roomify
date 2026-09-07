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
