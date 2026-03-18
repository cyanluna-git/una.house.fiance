import React from "react";

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function EmptyState({ message, icon, action }: EmptyStateProps) {
  return (
    <div className="p-8 text-center text-slate-400">
      {icon}
      <p>{message}</p>
      {action}
    </div>
  );
}
