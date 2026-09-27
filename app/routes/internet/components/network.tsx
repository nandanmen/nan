import { motion, type AnimationSequence } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

// Shared pieces for the internet visuals: the dotted grid, routers, and the
// link fill that draws a route as data travels along it.

type Point = { x: number; y: number };

// A point on a route. Points with a `routerId` are routers, rendered inside a
// `[data-router="<routerId>"]` group, and light up their dots as data passes through.
export type RoutePoint = Point & { routerId?: string };

export type RouterBadge = { label: string; fill: string; text: string };

export const FILL_COLOR = "var(--gray-12)";

// Shapes, routers and labels are drawn around their own origin. Figures are
// narrow on small screens, so draw them larger there without moving them.
export const NODE_SCALE = "max-lg:scale-150";

// Outlines of routers and other shapes: 1px, thickened on small screens where
// shapes are drawn larger.
export const SHAPE_STROKE = "[stroke-width:1] max-lg:[stroke-width:1.5]";

// Link thickness in pixels.
export const LINK_WIDTH = 4;
const FILL_TRANSITION = { type: "tween", duration: 0.3, ease: "linear" } as const;
const ROUTER_DOT_DELAY = 0.15;
const ROUTER_CENTER_DOT = 4;

// 3x3 grid of square dots filling this much of the router, indexed row by row
// from the top-left.
const ROUTER_DOT_GRID_SIZE = 0.6;
const ROUTER_DOT_GAP = 0.03;
const ROUTER_DOT_SIZE = (ROUTER_DOT_GRID_SIZE - 2 * ROUTER_DOT_GAP) / 3;
const ROUTER_DOT_POSITIONS = [-1, 0, 1].flatMap((row) =>
  [-1, 0, 1].map((col) => ({
    x: col * (ROUTER_DOT_SIZE + ROUTER_DOT_GAP) - ROUTER_DOT_SIZE / 2,
    y: row * (ROUTER_DOT_SIZE + ROUTER_DOT_GAP) - ROUTER_DOT_SIZE / 2,
  })),
);

// Picks the outer dot that faces `point`, snapping the direction to the nearest 45°.
function routerDotForDirection(router: Point, point: Point) {
  const octant = Math.round(Math.atan2(point.y - router.y, point.x - router.x) / (Math.PI / 4));
  const angle = (octant * Math.PI) / 4;
  const col = Math.round(Math.cos(angle));
  const row = Math.round(Math.sin(angle));
  return (row + 1) * 3 + (col + 1);
}

// Builds the animation that fills in each link along `path` in order. Link `i`
// is drawn by the `[data-link-fill="<i>"]` line, so the figure must render at
// least `path.length - 1` of them (see `LinkFills`). The route stays drawn at
// the end until `clearRoute` resets it, unless `retract` is set, in which case
// the fill then drains away toward the destination.
export function routeSequence(
  path: RoutePoint[],
  { retract = false }: { retract?: boolean } = {},
): AnimationSequence {
  // Sequences merge every segment for an element into one keyframe track, so
  // instant changes use explicit [from, to] keyframes to avoid interpolating
  // between segments.
  const instant = (at: number) => ({ duration: 0, at });
  const sequence: AnimationSequence = [];
  let time = 0;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const next = path[i];
    const fill = `[data-link-fill="${i - 1}"]`;

    // Grow the filled line from the previous point toward the next one.
    sequence.push([fill, { x1: [prev.x, prev.x], y1: [prev.y, prev.y] }, instant(time)]);
    sequence.push([fill, { opacity: [0, 1] }, instant(time)]);
    sequence.push([
      fill,
      { x2: [prev.x, next.x], y2: [prev.y, next.y] },
      { ...FILL_TRANSITION, at: time },
    ]);
    time += FILL_TRANSITION.duration;

    const after = path[i + 1];
    if (next.routerId && after) {
      const dot = (index: number) =>
        `[data-router="${next.routerId}"] [data-router-dot="${index}"]`;
      // Light the dots in the order the data crosses the router: in, through the center, out.
      sequence.push([dot(routerDotForDirection(next, prev)), { opacity: [0, 1] }, instant(time)]);
      time += ROUTER_DOT_DELAY;
      sequence.push([dot(ROUTER_CENTER_DOT), { opacity: [0, 1] }, instant(time)]);
      time += ROUTER_DOT_DELAY;
      sequence.push([dot(routerDotForDirection(next, after)), { opacity: [0, 1] }, instant(time)]);
    }
  }

  if (retract) {
    // Pull the start of each filled line toward its end, one link after another.
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const next = path[i];
      const fill = `[data-link-fill="${i - 1}"]`;
      sequence.push([
        fill,
        { x1: [prev.x, next.x], y1: [prev.y, next.y] },
        { ...FILL_TRANSITION, at: time },
      ]);
      time += FILL_TRANSITION.duration;
      sequence.push([fill, { opacity: [1, 0] }, instant(time)]);
    }
  }

  return sequence;
}

// Hides any drawn route and lit router dots.
export function clearRoute(
  animate: (
    selector: string,
    values: { opacity: number },
    options: { duration: number },
  ) => unknown,
) {
  animate("[data-link-fill]", { opacity: 0 }, { duration: 0 });
  animate("[data-router-dot]", { opacity: 0 }, { duration: 0 });
}

// Lines that `routeSequence` positions and grows over the links of a route.
export function LinkFills({ count }: { count: number }) {
  return (
    <g style={{ stroke: FILL_COLOR }}>
      {Array.from({ length: count }, (_, i) => (
        <motion.line
          key={i}
          data-link-fill={i}
          initial={{ opacity: 0 }}
          vectorEffect="non-scaling-stroke"
          strokeWidth={LINK_WIDTH}
        />
      ))}
    </g>
  );
}

const FIGURE_SIZE = 16;
// Grid lines fall every this many units on small screens.
const SMALL_SCREEN_GRID_STEP = 2;

type LabeledPoint = Point & { label?: Point };

// Offset that moves the middle of [min, max] to the middle of the figure, in
// whole grid cells so points stay on the grid lines.
function centeringShift(values: number[]) {
  const middle = (Math.min(...values) + Math.max(...values)) / 2;
  const cells = Math.round((FIGURE_SIZE / 2 - middle) / SMALL_SCREEN_GRID_STEP);
  return cells * SMALL_SCREEN_GRID_STEP;
}

/** Centers a drawing of `points` (and their labels) in its 16-unit figure on small screens. */
export function SmallScreenCenter({
  points,
  children,
}: {
  points: LabeledPoint[];
  children: ReactNode;
}) {
  const withLabels = points.flatMap((point) => (point.label ? [point, point.label] : [point]));
  // CSS lengths on SVG content are in user units, so px here means grid units.
  const style = {
    "--center-x": `${centeringShift(withLabels.map((point) => point.x))}px`,
    "--center-y": `${centeringShift(withLabels.map((point) => point.y))}px`,
  } as CSSProperties;

  return (
    <g
      className="max-lg:translate-x-(--center-x) max-lg:translate-y-(--center-y) transition-[translate] duration-300"
      style={style}
    >
      {children}
    </g>
  );
}

export function RouterShape({ badge }: { badge: RouterBadge }) {
  return (
    <>
      {/* Numbered card tucked behind the router, peeking out above it. Labels in
          these figures center their digits with dy rather than
          dominant-baseline, which iOS WebKit places too high. */}
      <g>
        <rect x="-0.25" y="-0.92" width="0.5" height="0.72" style={{ fill: badge.fill }} />
        <text
          y="-0.68"
          style={{ fill: badge.text }}
          className="font-sans"
          fontSize="0.28"
          fontWeight="700"
          textAnchor="middle"
          dy="0.35em"
        >
          {badge.label}
        </text>
      </g>
      <rect
        width="0.9"
        height="0.9"
        x="-0.45"
        y="-0.45"
        style={{ fill: "white", stroke: "var(--gray-12)" }}
        className={SHAPE_STROKE}
        vectorEffect="non-scaling-stroke"
      />
      {ROUTER_DOT_POSITIONS.map(({ x, y }, index) => (
        <g key={index}>
          <rect
            x={x}
            y={y}
            width={ROUTER_DOT_SIZE}
            height={ROUTER_DOT_SIZE}
            style={{ fill: "var(--gray-5)" }}
          />
          <rect
            data-router-dot={index}
            x={x}
            y={y}
            width={ROUTER_DOT_SIZE}
            height={ROUTER_DOT_SIZE}
            style={{ fill: badge.fill, transformBox: "fill-box", transformOrigin: "center" }}
            opacity="0"
          />
        </g>
      ))}
    </>
  );
}
