import { mdxComponents } from "../../components/mdx-components";
import { Icon } from "../../components/icon";
import { ScrollerButton } from "../../components/scroller-button";
import { Scroller } from "../../components/scroller";
import { Steps } from "../../components/steps";
import GpuRasterizationContent from "./page.mdx";
import { Provider } from "jotai";

export function meta() {
  return [
    { title: "Browser GPU Rasterization" },
    {
      name: "description",
      content: "How the browser turns layout into pixels on the GPU.",
    },
  ];
}

export default function GpuRasterization() {
  return (
    <main className="text-lg leading-relaxed grid gap-y-24 py-32">
      <header className="w-full max-w-[calc(60ch+2rem)] px-4 mx-auto grid gap-y-6">
        <h1 className="text-[56px] font-serif max-lg:leading-[1.05]">Browser GPU Rasterization</h1>
        <p>TODO: intro.</p>
      </header>
      <div className="px-4">
        <article className="grid grid-cols-[minmax(0,1fr)_minmax(0,60ch)_minmax(0,1fr)] gap-y-6 [&>*:not([data-full-width])]:col-start-2 [&>*[data-full-width]]:col-span-full [&_:not(pre)>code]:bg-white [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:ring-1 [&_:not(pre)>code]:ring-black/15 [&_:not(pre)>code]:text-[0.875em]">
          <Provider>
            <GpuRasterizationContent
              components={{
                Icon,
                Scroller,
                ScrollerButton,
                Steps,
                ...mdxComponents,
              }}
            />
          </Provider>
        </article>
      </div>
    </main>
  );
}
