import type { ReactNode } from "react";
import { CodeBlock } from "./code-block";
import InternetContent from "./page.mdx";
import { InterruptedWorldMap } from "./world-map";

export function meta() {
  return [
    { title: "The Internet" },
    {
      name: "description",
      content: "An introduction to how the internet connects the world.",
    },
  ];
}

const code = `const response = await fetch("https://example.com");
const data = await response.json();
console.log(data);`;

export default function Internet() {
  return (
    <main className="text-lg leading-relaxed grid gap-y-24 pb-32">
      <InterruptedWorldMap />
      <header className="max-w-[60ch] mx-auto grid gap-y-6">
        <h1 className="text-[56px] font-serif">How does the Internet work?</h1>
        <p>
          It's really easy to overlook the way the internet works. In JavaScript, we can make
          software that talks to other computers on the internet simply using a `fetch` call:
        </p>
        <CodeBlock>
          <div className="language-tsx">{code}</div>
        </CodeBlock>
        <p>
          But what's really happening under the hood when we do that? How does our request to fetch
          the webpage actually make it to the server? Let's find out by remaking our own
          mini-version of the Internet.
        </p>
      </header>
      <div className="px-4">
        <article className="grid grid-cols-[minmax(0,1fr)_minmax(0,60ch)_minmax(0,1fr)] gap-y-6 [&>*:not([data-full-width])]:col-start-2 [&>*[data-full-width]]:col-span-full">
          <InternetContent
            components={{
              h2: ({ children }: { children: ReactNode }) => (
                <h2 className="text-2xl font-medium">{children}</h2>
              ),
              strong: ({ children }: { children: ReactNode }) => (
                <strong className="font-medium">{children}</strong>
              ),
              pre: CodeBlock,
            }}
          />
        </article>
      </div>
    </main>
  );
}
