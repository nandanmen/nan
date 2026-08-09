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
      className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-24 my-18 first:mt-0 last:mb-0"
      data-full-width
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,60ch)]">
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
      <div className="sticky top-16 max-h-[calc(100vh-128px)] max-w-[60ch] h-fit">
        <ActiveSectionContext value={activeSection}>{figure}</ActiveSectionContext>
      </div>
    </div>
  );
}
