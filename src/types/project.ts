export type ProjectStatus = "planning" | "in-progress" | "done";

export type Project = {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: ProjectStatus;
  updatedAt: string;
};
