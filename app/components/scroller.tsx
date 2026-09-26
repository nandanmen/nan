import {
  Children,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "cn";

type Section = {
  index: number;
  // The section's own copy of the figure, shown below it on small screens.
  inlineFigure: FigureState;
};

export type ScrollerEvent = {
  type: string;
  [parameter: string]: unknown;
};

type ScrollerEventListener = (event: ScrollerEvent, index: number) => void;

type AvailableEvents = { index: number; types: string[] } | null;

type FigureState = {
  activeSection: number;
  listeners: Set<ScrollerEventListener>;
  availableEvents: AvailableEvents;
  setAvailableEvents: Dispatch<SetStateAction<AvailableEvents>>;
};

const ScrollerContext = createContext<FigureState | null>(null);
const SectionProvider = createContext<Section | null>(null);

type ScrollerProps = {
  children: ReactNode;
  figure: ReactNode;
};

// Matches Tailwind's `lg` breakpoint, where the figure sits beside the text.
const WIDE_QUERY = "(min-width: 64rem)";

function subscribeToWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the Scroller shows one sticky figure beside the text, rather than a figure per section. */
function useIsWide() {
  return useSyncExternalStore(
    subscribeToWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

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

/** Returns the state of a surrounding Scroller. */
export function useScroller() {
  const scroller = useContext(ScrollerContext);

  if (scroller === null) {
    throw new Error("useScroller must be used inside a Scroller figure.");
  }

  return scroller;
}

export function useSection() {
  const section = useContext(SectionProvider);

  if (section === null) {
    throw new Error("useSection must be used inside a SectionProvider.");
  }

  return section;
}

const ACTIVE_THRESHOLD = 0.7;

/** Dotted grid behind a figure, one line every `--grid-size`. */
function FigureGrid() {
  return (
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
        backgroundPosition: "calc(var(--grid-size) / -2) 0px, 0px calc(var(--grid-size) / -2)",
        backgroundRepeat: "repeat, repeat",
      }}
    />
  );
}

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

export function useScrollerDispatch() {
  const { index, inlineFigure } = useSection();
  const scroller = useScroller();
  const listeners = useIsWide() ? scroller.listeners : inlineFigure.listeners;
  return useCallback(
    (event: ScrollerEvent) => {
      for (const listener of listeners) listener(event, index);
    },
    [index, listeners],
  );
}

export function useScrollerCanSend(event: ScrollerEvent) {
  const { index, inlineFigure } = useSection();
  const scroller = useScroller();
  const { activeSection, availableEvents } = useIsWide() ? scroller : inlineFigure;
  return (
    index === activeSection &&
    availableEvents?.index === index &&
    availableEvents.types.includes(event.type)
  );
}

export function useScrollerEvent(listener: ScrollerEventListener) {
  const { listeners } = useScroller();
  useEffect(() => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [listeners, listener]);
}

/**
 * Presents MDX sections beside a sticky figure. Horizontal rules in children
 * delimit sections, so MDX's `---` syntax can be used as the separator.
 */
export function Scroller({ children, figure }: ScrollerProps) {
  const sections = useMemo(() => splitSections(children), [children]);
  const sectionElements = useRef<Array<HTMLElement | null>>([]);

  const [activeSection, setActiveSection] = useState(0);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvents>(null);
  const listenersRef = useRef(new Set<ScrollerEventListener>());

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
    <ScrollerContext
      value={{
        activeSection,
        listeners: listenersRef.current,
        availableEvents,
        setAvailableEvents,
      }}
    >
      <div
        className={cn(
          "[--scroller-gutter-size:32px] [--scroller-padding:calc(var(--spacing)*8)] [--scroller-figure-padding:calc(var(--scroller-padding)*2)]",
          "grid grid-cols-1 lg:grid-cols-[var(--scroller-gutter-size)_minmax(0,1fr)_minmax(0,1fr)_var(--scroller-gutter-size)] lg:my-18 first:mt-0 last:mb-0 [&:has(+_[data-scroller])]:mb-0 [[data-scroller]+&]:-mt-2 lg:bg-olive-1 lg:divide-x lg:divide-black/10 lg:shadow w-full max-w-[calc(120ch+var(--scroller-padding)*4+var(--scroller-gutter-size)*2)] mx-auto",
        )}
        data-scroller
        data-full-width
      >
        <PaperGutter />
        <div className="grid grid-cols-[minmax(0,60ch)] justify-center gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,60ch)] lg:gap-y-0 lg:p-16">
          {sections.map((section, index) => (
            <ScrollerSection
              figure={figure}
              index={index}
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              key={index}
              sectionRef={(element) => {
                sectionElements.current[index] = element;
              }}
            >
              {section}
            </ScrollerSection>
          ))}
        </div>
        <figure
          className="hidden lg:block min-w-0 p-(--scroller-padding)"
          style={{ containerType: "inline-size" }}
        >
          <div className="[--grid-size:12.5cqw] xl:[--grid-size:6.25cqw] [height:round(down,100%,var(--grid-size))] [max-height:round(down,100vh,var(--grid-size))] sticky -top-px">
            <FigureGrid />
            <div className="sticky h-fit top-[calc(var(--grid-size)*3)]">{figure}</div>
          </div>
        </figure>
        <PaperGutter />
      </div>
    </ScrollerContext>
  );
}

function ScrollerSection({
  children,
  figure,
  index,
  sectionRef,
}: {
  children: ReactNode;
  figure: ReactNode;
  index: number;
  sectionRef: (element: HTMLElement | null) => void;
}) {
  const [availableEvents, setAvailableEvents] = useState<AvailableEvents>(null);
  const listeners = useRef(new Set<ScrollerEventListener>()).current;
  const inlineFigure = useMemo(
    () => ({ activeSection: index, listeners, availableEvents, setAvailableEvents }),
    [index, listeners, availableEvents],
  );

  return (
    <SectionProvider value={{ index, inlineFigure }}>
      <section
        className="lg:min-h-[45vh] grid gap-y-6 auto-rows-min lg:col-start-2"
        ref={sectionRef}
      >
        {children}
        {/* On small screens, each section shows its own scene right below its text. */}
        <ScrollerContext value={inlineFigure}>
          <div className="lg:hidden [container-type:inline-size]">
            <div className="relative [--grid-size:12.5cqw]">
              <FigureGrid />
              <div className="relative">{figure}</div>
            </div>
          </div>
        </ScrollerContext>
      </section>
    </SectionProvider>
  );
}
