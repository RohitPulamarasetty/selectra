import type { ReactNode } from "react";

type Layout = "workspace" | "dashboard" | "student" | "auth" | "page";

export function LoadingSkeleton({ layout, label }: { layout: Layout; label: string }) {
  return <div className={`loading-skeleton loading-skeleton-${layout}`} role="status">
    <span className="loading-label">{label}</span>
    <div aria-hidden="true" className="loading-shapes">
      {layout === "auth" ? <SkeletonPanel rows={3} /> : <>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
        {layout === "student" ? <div className="loading-student-grid">
          <SkeletonPanel rows={3} /><SkeletonPanel rows={4} />
        </div> : <>
          {layout === "dashboard" && <>
            <div className="skeleton skeleton-banner" />
            <div className="stats-grid">
              {[0, 1, 2, 3].map((card) => <div key={card} className="skeleton skeleton-card" />)}
            </div>
          </>}
          <SkeletonPanel rows={5} />
        </>}
      </>}
    </div>
  </div>;
}

function SkeletonPanel({ rows }: { rows: number }) {
  const lines: ReactNode[] = [];
  for (let line = 0; line < rows; line++) lines.push(<div key={line} className="skeleton skeleton-line" />);
  return <div className="skeleton-panel">{lines}</div>;
}
