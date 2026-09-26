import type { ReactNode } from "react";

// Text-only building blocks for the article body.

export function Callout({ children }: { children: ReactNode }) {
  return <div className="grid gap-y-4 border-l-2 border-gray-7 pl-4">{children}</div>;
}

export function ProblemStatement({ children }: { children: ReactNode }) {
  return <div className="grid gap-y-4 border bg-white p-4 font-medium">{children}</div>;
}

export function Aside({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside className="grid gap-y-4 border bg-white p-6">
      <p className="font-medium">{label}</p>
      {children}
    </aside>
  );
}
