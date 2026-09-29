import type { Project, ProjectStatus } from "../../types/project";

const statusLabel: Record<ProjectStatus, string> = {
  planning: "Planning",
  "in-progress": "In progress",
  done: "Done",
};

const statusColor: Record<ProjectStatus, string> = {
  planning: "bg-[#ded9cf] text-[#665f55]",
  "in-progress": "bg-[#c9e4da] text-[#245849]",
  done: "bg-[#f1d1b1] text-[#764419]",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="border-t border-[#bdb5a9] py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.04em]">{project.title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#79736b]">{project.description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${statusColor[project.status]}`}>{statusLabel[project.status]}</span>
      </div>
      <div className="mt-5 flex gap-6 text-xs text-[#938b80]">
        <span>{project.owner}</span>
        <span>Updated {project.updatedAt}</span>
      </div>
    </article>
  );
}
