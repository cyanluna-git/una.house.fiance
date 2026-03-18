interface LoadingSkeletonProps {
  rows?: number;
  variant?: "table" | "card" | "list";
  className?: string;
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden">
      <div className="bg-slate-100 h-10 mb-1" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-12" />
          <div className="h-4 bg-slate-200 rounded flex-1" />
          <div className="h-4 bg-slate-200 rounded w-20" />
          <div className="h-4 bg-slate-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow p-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
          <div className="h-6 bg-slate-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow px-5 py-4 animate-pulse flex items-center gap-4">
          <div className="h-6 w-16 bg-slate-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
          <div className="h-8 w-16 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({
  rows = 3,
  variant = "list",
  className = "",
}: LoadingSkeletonProps) {
  return (
    <div className={className}>
      {variant === "table" && <TableSkeleton rows={rows} />}
      {variant === "card" && <CardSkeleton rows={rows} />}
      {variant === "list" && <ListSkeleton rows={rows} />}
    </div>
  );
}
