export type ProjectRow = {
  id: string;
  name: string | null;
  sourceImage: string;
  sourcePath: string | null;
  renderedImage: string | null;
  renderedPath: string | null;
  isPublic: boolean;
  timestamp: bigint;
  ownerId: string;
};

export const toDesignItem = (project: ProjectRow) => ({
  id: project.id,
  name: project.name,
  sourceImage: project.sourceImage,
  sourcePath: project.sourcePath,
  renderedImage: project.renderedImage,
  renderedPath: project.renderedPath,
  isPublic: project.isPublic,
  timestamp: Number(project.timestamp),
  ownerId: project.ownerId,
});
