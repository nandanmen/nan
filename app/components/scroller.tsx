import {
  Children,
  type ReactNode,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "cn";

const ActiveSectionContext = createContext<number | null>(null);

type ScrollerProps = {
  children: ReactNode;
  figure: ReactNode;
};

function isSectionDivider(child: ReactNode) {
  if (!isValidElement(child)) return false;

  if (child.type === "hr") return true;

  if (typeof child.type !== "function") return false;

  const component = child.type as { displayName?: string; name?: string };
  return component.displayName === "hr" || component.name === "hr";
}

function splitSections(children: ReactNode) {
  return Children.toArray(children).reduce<ReactNode[][]>(
    (sections, child) => {
      if (isSectionDivider(child)) {
        sections.push([]);
      } else {
        sections.at(-1)?.push(child);
      }

      return sections;
    },
    [[]],
  );
}

/** Returns the index of the section currently driving a surrounding Scroller. */
export function useActiveSection() {
  const activeSection = useContext(ActiveSectionContext);

  if (activeSection === null) {
    throw new Error("useActiveSection must be used inside a Scroller figure.");
  }

  return activeSection;
}

const ACTIVE_THRESHOLD = 0.6;

function PaperGutter() {
  return (
    <div aria-hidden="true" className="relative hidden lg:block">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--olive-2) 5px, rgb(0 0 0 / 0.15) 5.5px, transparent 6px)",
          backgroundSize: "100% var(--grid-size)",
          backgroundRepeat: "repeat-y",
        }}
      />
    </div>
  );
}

/**
 * Presents MDX sections beside a sticky figure. Horizontal rules in children
 * delimit sections, so MDX's `---` syntax can be used as the separator.
 */
export function Scroller({ children, figure }: ScrollerProps) {
  const sections = useMemo(() => splitSections(children), [children]);
  const sectionElements = useRef<Array<HTMLElement | null>>([]);
  const [activeSection, setActiveSection] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    let frame: number | undefined;

    const updateActiveSection = () => {
      frame = undefined;
      const activationLine = window.innerHeight * (1 - ACTIVE_THRESHOLD);
      let nextActiveSection = 0;

      for (const [index, section] of sectionElements.current.entries()) {
        if (section && section.getBoundingClientRect().top <= activationLine) {
          nextActiveSection = index;
        }
      }

      setActiveSection(nextActiveSection);
    };

    const requestUpdate = () => {
      if (frame === undefined) frame = requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [sections.length]);

  return (
    <div
      className={cn(
        "[--grid-size:32px] [--scroller-padding:calc(var(--spacing)*8)] [--scroller-figure-padding:calc(var(--scroller-padding)*2)]",
        "grid grid-cols-1 gap-12 lg:grid-cols-[var(--grid-size)_minmax(0,1fr)_calc(round(down,calc(50%-var(--grid-size)-var(--scroller-padding)*2),calc(var(--grid-size)*2))+var(--scroller-padding)*2)_var(--grid-size)] lg:gap-0 my-18 first:mt-0 last:mb-0 bg-olive-1 divide-x divide-black/10 shadow w-full max-w-[calc(120ch+var(--scroller-padding)*4+var(--grid-size)*2)] mx-auto",
      )}
      style={{
        height:
          "calc(round(up, calc(100% - var(--scroller-padding) * 2), calc(var(--grid-size) * 2)) + var(--scroller-padding) * 2)",
      }}
      data-full-width
    >
      <PaperGutter />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,60ch)] p-16">
        {sections.map((section, index) => (
          <section
            className="min-h-[45vh] grid gap-y-6 auto-rows-min col-start-2"
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            key={index}
            ref={(element) => {
              sectionElements.current[index] = element;
            }}
          >
            {section}
          </section>
        ))}
      </div>
      <figure
        className="p-(--scroller-padding)"
        style={{
          backgroundImage: [
            "radial-gradient(circle at center, rgb(0 0 0 / 0.1) 0.5px, transparent 1px)",
            "radial-gradient(circle at center, rgb(0 0 0 / 0.1) 0.5px, transparent 1px)",
            "radial-gradient(circle at 0.5px 2px, rgb(0 0 0 / 0.1) 0.5px, transparent 1px)",
            "radial-gradient(circle at 2px 0.5px, rgb(0 0 0 / 0.1) 0.5px, transparent 1px)",
          ].join(", "),
          backgroundSize: "1px 4px, 4px 1px, var(--grid-size) 4px, 4px var(--grid-size)",
          backgroundPosition: "right top, left bottom, left top, left top",
          backgroundRepeat: "repeat-y, repeat-x, repeat, repeat",
          backgroundOrigin: "content-box",
          backgroundClip: "content-box",
        }}
      >
        <div
          className="sticky top-(--scroller-figure-padding) max-h-[calc(100vh-var(--scroller-figure-padding)*2)] h-fit"
          style={{
            // Keep the figure origin on a background grid intersection.
            margin:
              "round(down, max(0px, calc(var(--scroller-figure-padding) - var(--scroller-padding))), var(--grid-size))",
          }}
        >
          <ActiveSectionContext value={activeSection}>{figure}</ActiveSectionContext>
        </div>
      </figure>
      <PaperGutter />
    </div>
  );
}
