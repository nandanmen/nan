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

type Section = {
  index: number;
};

const ActiveSectionContext = createContext<number | null>(null);
const SectionProvider = createContext<Section | null>(null);

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

export function useSection() {
  const section = useContext(SectionProvider);

  if (section === null) {
    throw new Error("useSection must be used inside a SectionProvider.");
  }

  return section;
}

const ACTIVE_THRESHOLD = 0.7;

function PaperGutter() {
  return (
    <div aria-hidden="true" className="relative hidden lg:block">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--olive-2) 5px, rgb(0 0 0 / 0.15) 5.5px, transparent 6px)",
          backgroundSize: "100% var(--scroller-gutter-size)",
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
        "[--scroller-gutter-size:32px] [--scroller-padding:calc(var(--spacing)*8)] [--scroller-figure-padding:calc(var(--scroller-padding)*2)]",
        "grid grid-cols-1 gap-12 lg:grid-cols-[var(--scroller-gutter-size)_minmax(0,1fr)_minmax(0,1fr)_var(--scroller-gutter-size)] lg:gap-0 my-18 first:mt-0 last:mb-0 [&:has(+_[data-scroller])]:mb-0 [[data-scroller]+&]:-mt-2 bg-olive-1 divide-x divide-black/10 shadow w-full max-w-[calc(120ch+var(--scroller-padding)*4+var(--scroller-gutter-size)*2)] mx-auto",
      )}
      data-scroller
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
            <SectionProvider value={{ index }}>{section}</SectionProvider>
          </section>
        ))}
      </div>
      <figure
        className="min-w-0 p-(--scroller-padding) pb-0"
        style={{ containerType: "inline-size" }}
      >
        <div className="[--grid-size:12.5cqw] xl:[--grid-size:6.25cqw] h-full max-h-screen sticky -top-px">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px p-px"
            style={{
              // Give edge dots room to paint while keeping the original grid origin.
              backgroundOrigin: "content-box",
              backgroundClip: "border-box",
              // Center each dotted line on the SVG's grid coordinates.
              // Offset centered tiles by half a cell so lines start at zero.
              backgroundImage: [
                "radial-gradient(circle at center, rgb(0 0 0 / 0.15) 0.5px, transparent 1px)",
                "radial-gradient(circle at center, rgb(0 0 0 / 0.15) 0.5px, transparent 1px)",
              ].join(", "),
              backgroundSize: "var(--grid-size) 4px, 4px var(--grid-size)",
              backgroundPosition:
                "calc(var(--grid-size) / -2) 0px, 0px calc(var(--grid-size) / -2)",
              backgroundRepeat: "repeat, repeat",
            }}
          />
          <div className="sticky h-fit top-[calc(var(--grid-size)*3)]">
            <ActiveSectionContext value={activeSection}>{figure}</ActiveSectionContext>
          </div>
        </div>
      </figure>
      <PaperGutter />
    </div>
  );
}
