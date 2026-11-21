import type { ComponentProps, ReactNode } from "react";
import { Button } from "./button";
import { CodeBlock } from "./code-block";
import { Toolbar } from "./toolbar";

export const mdxComponents = {
  // Headings pass through extra props so dev-only source attributes (see vite/mdx-edit.ts) survive.
  h2: (props: ComponentProps<"h2">) => <h2 className="text-2xl font-medium" {...props} />,
  h3: (props: ComponentProps<"h3">) => <h3 className="text-xl font-medium" {...props} />,
  ol: ({ children }: { children: ReactNode }) => (
    <ol className="grid list-decimal gap-y-2 pl-6 tabular-nums marker:text-gray-9">{children}</ol>
  ),
  ul: ({ children }: { children: ReactNode }) => (
    <ul className="grid list-disc gap-y-2 pl-6">{children}</ul>
  ),
  a: ({ children, href }: { children: ReactNode; href?: string }) => (
    <a className="underline [overflow-wrap:anywhere]" href={href}>
      {children}
    </a>
  ),
  strong: ({ children }: { children: ReactNode }) => (
    <strong className="font-medium">{children}</strong>
  ),
  pre: CodeBlock,
  // Available to every MDX page, e.g. when inserted with the dev editor's "/" menu.
  Button,
  Toolbar,
};
