import {
  useVisual,
  type SceneDefinition,
  type ScenePoint,
  type Visual,
} from "../../../hooks/use-visual";
import { useScrollerEvent, type ScrollerEvent } from "../../../components/scroller";
import { motion, useAnimate } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import {
  clearRoute,
  LinkFills,
  NODE_SCALE,
  routeSequence,
  RouterShape,
  SmallScreenCenter,
  type RoutePoint,
  type RouterBadge,
  LINK_WIDTH,
  SHAPE_STROKE,
} from "./network";

const scenes: SceneDefinition[] = [
  {
    one: { x: 8, y: 3, label: { x: 8, y: 1.5, text: "1" } },
    four: { x: 11, y: 5, label: { x: 12.423, y: 4.526, text: "4" } },
    three: { x: 10, y: 9, label: { x: 10.832, y: 10.248, text: "3" } },
    two: { x: 6, y: 9, label: { x: 5.168, y: 10.248, text: "2" } },
    five: { x: 5, y: 5, label: { x: 3.577, y: 4.526, text: "5" } },
    routerOne: { x: 8, y: 6 },
  },
  {
    one: { x: 5, y: 5, label: { x: 4, y: 4, text: "1.1" } },
    two: { x: 4, y: 7, label: { x: 2.5, y: 7, text: "1.2" } },
    three: { x: 7, y: 4, label: { x: 7, y: 2.5, text: "1.3" } },
    routerOne: { x: 7, y: 7 },
    four: { x: 12, y: 9, label: { x: 13.5, y: 9, text: "2.1" } },
    five: { x: 11, y: 11, label: { x: 12, y: 12, text: "2.2" } },
    six: { x: 9, y: 12, label: { x: 9, y: 13.5, text: "2.3" } },
    routerTwo: { x: 9, y: 9 },
  },
];

const routerNetworkVisual: Visual = {
  points: {
    one: { shape: "circle", className: "fill-blue-7", label: "1" },
    two: { shape: "square", className: "fill-yellow-10", label: "2" },
    three: { shape: "triangle", className: "fill-red-8", label: "3" },
    four: { shape: "circle", className: "fill-cyan-9", label: "2.1" },
    five: { shape: "diamond", className: "fill-green-9", label: "2.2" },
    six: { shape: "square", className: "fill-blue-9", label: "2.3" },
    routerOne: { shape: "router", className: "fill-white", label: "R1" },
    routerTwo: { shape: "router", className: "fill-white", label: "R2" },
  },
  scenes,
  events: ["send-packet"],
};

const SWIFT_TRANSITION = {
  type: "spring",
  stiffness: 280,
  damping: 18,
  mass: 0.3,
} as const;

const LABEL_OFFSET_SCALE = 0.75;

// Each router's card uses its network's color.
const ROUTER_BADGES: Record<string, RouterBadge> = {
  routerOne: { label: "1", fill: "var(--blue-9)", text: "white" },
  routerTwo: { label: "2", fill: "var(--orange-8)", text: "white" },
};

type SendPacketEvent = ScrollerEvent & {
  type: "send-packet";
  from: string;
  to: string;
};

function isSendPacketEvent(event: ScrollerEvent): event is SendPacketEvent {
  return (
    event.type === "send-packet" && typeof event.from === "string" && typeof event.to === "string"
  );
}

const firstNetworkConnections = [
  ["routerOne", "one"],
  ["routerOne", "two"],
  ["routerOne", "three"],
  ["routerOne", "four"],
  ["routerOne", "five"],
] as const;

const twoNetworkConnections = [
  ["routerOne", "one"],
  ["routerOne", "two"],
  ["routerOne", "three"],
  ["routerTwo", "four"],
  ["routerTwo", "five"],
  ["routerTwo", "six"],
  ["routerOne", "routerTwo"],
] as const;

function getConnections(scene: ScenePoint[]) {
  const pointById = new Map(scene.map((point) => [point.id, point]));
  const connections = pointById.has("routerTwo") ? twoNetworkConnections : firstNetworkConnections;

  return connections.flatMap(([fromId, toId]) => {
    const from = pointById.get(fromId);
    const to = pointById.get(toId);
    return from && to ? [{ from, to }] : [];
  });
}

// Finds the shortest chain of links from `from` to `to`, marking routers along the way.
function findRoute(
  links: { from: ScenePoint; to: ScenePoint }[],
  from: ScenePoint,
  to: ScenePoint,
): RoutePoint[] | null {
  const neighbors = new Map<string, ScenePoint[]>();
  for (const link of links) {
    neighbors.set(link.from.id, [...(neighbors.get(link.from.id) ?? []), link.to]);
    neighbors.set(link.to.id, [...(neighbors.get(link.to.id) ?? []), link.from]);
  }

  const previous = new Map<string, ScenePoint | null>([[from.id, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const point = queue.shift()!;
    if (point.id === to.id) break;
    for (const next of neighbors.get(point.id) ?? []) {
      if (previous.has(next.id)) continue;
      previous.set(next.id, point);
      queue.push(next);
    }
  }
  if (!previous.has(to.id)) return null;

  const route: RoutePoint[] = [];
  for (let point: ScenePoint | null = to; point; point = previous.get(point.id) ?? null) {
    route.unshift(point.shape === "router" ? { ...point, routerId: point.id } : point);
  }
  return route;
}

export function RouterNetwork() {
  const scene = useVisual(routerNetworkVisual);
  const previousPoints = useRef(new Map<string, ScenePoint>());
  const [scope, animate] = useAnimate();
  const animationRef = useRef<{ stop: () => void } | null>(null);

  const links = getConnections(scene);

  useScrollerEvent((event) => {
    if (!isSendPacketEvent(event)) return;

    const from = scene.find((point) => point.id === event.from);
    const to = scene.find((point) => point.id === event.to);
    const route = from && to && findRoute(links, from, to);
    if (!route) return;

    animationRef.current?.stop();
    clearRoute(animate);
    animationRef.current = animate(routeSequence(route), {
      onComplete: () => {
        animationRef.current = null;
      },
    });
  });

  useLayoutEffect(() => {
    previousPoints.current = new Map(scene.map((point) => [point.id, point]));
  }, [scene]);

  // A drawn route no longer lines up once the points move, so clear it.
  const layoutKey = scene.map((point) => `${point.id}:${point.x},${point.y}`).join(" ");
  useLayoutEffect(() => {
    animationRef.current?.stop();
    animationRef.current = null;
    clearRoute(animate);
  }, [layoutKey, animate]);

  const hasSecondNetwork = scene.some((point) => point.id === "routerTwo");

  return (
    <div className="w-full">
      <svg
        ref={scope}
        aria-label="Computer networks connected by routers"
        className="block w-full h-auto aspect-square overflow-visible"
        fill="none"
        role="img"
        viewBox="0 0 16 16"
      >
        <SmallScreenCenter points={scene}>
          <g stroke="currentColor" className="text-gray-7">
            {links.map(({ from, to }) => (
              <motion.line
                key={`${from.id}-${to.id}`}
                animate={{
                  x1: from.x,
                  y1: from.y,
                  x2: to.x,
                  y2: to.y,
                }}
                initial={{
                  x1: previousPoints.current.get(from.id)?.x ?? from.x,
                  y1: previousPoints.current.get(from.id)?.y ?? from.y,
                  x2: previousPoints.current.get(to.id)?.x ?? to.x,
                  y2: previousPoints.current.get(to.id)?.y ?? to.y,
                }}
                transition={SWIFT_TRANSITION}
                vectorEffect="non-scaling-stroke"
                strokeWidth={LINK_WIDTH}
              />
            ))}
          </g>
          <LinkFills count={links.length} />
          {scene.map(
            (point) =>
              point.label && (
                <VertexLabel
                  key={`${point.id}-label`}
                  label={point.label.text}
                  x={point.label.x}
                  y={point.label.y}
                  targetX={point.x}
                  targetY={point.y}
                />
              ),
          )}
          {scene.map((point) => (
            <ScenePoint
              key={point.id}
              point={
                hasSecondNetwork && point.shape !== "router"
                  ? {
                      ...point,
                      className: ["four", "five", "six"].includes(point.id)
                        ? "fill-orange-8"
                        : "fill-blue-7",
                    }
                  : point
              }
            />
          ))}
        </SmallScreenCenter>
      </svg>
    </div>
  );
}

function ScenePoint({ point }: { point: ScenePoint }) {
  return (
    <motion.g
      animate={{ x: point.x, y: point.y }}
      data-point-id={point.id}
      data-router={point.shape === "router" ? point.id : undefined}
      initial={false}
      transition={SWIFT_TRANSITION}
    >
      <g className={NODE_SCALE}>
        {point.shape === "router" ? (
          <RouterShape badge={ROUTER_BADGES[point.id]} />
        ) : (
          <Shape type={point.shape} className={point.className} />
        )}
      </g>
    </motion.g>
  );
}

function Shape({ type, className }: { type: ScenePoint["shape"]; className?: string }) {
  const triangleHeight = Math.sqrt(3) / 2;
  switch (type) {
    case "circle":
      return (
        <circle
          className={`${className} stroke-current ${SHAPE_STROKE}`}
          vectorEffect="non-scaling-stroke"
          r="0.4"
        />
      );
    case "square":
      return (
        <rect
          x="-0.4"
          y="-0.4"
          className={`${className} stroke-current ${SHAPE_STROKE}`}
          vectorEffect="non-scaling-stroke"
          width="0.8"
          height="0.8"
        />
      );
    case "triangle":
      return (
        <polygon
          points={`0,${(-2 * triangleHeight) / 3} 0.5,${triangleHeight / 3} -0.5,${triangleHeight / 3}`}
          className={`${className} stroke-current ${SHAPE_STROKE}`}
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
      );
    case "diamond":
      return (
        <polygon
          points="0,-0.6 0.48,0 0,0.6 -0.48,0"
          className={`${className} stroke-current ${SHAPE_STROKE}`}
          vectorEffect="non-scaling-stroke"
        />
      );
    case "router":
      return null;
  }
}

function VertexLabel({
  label,
  x,
  y,
  targetX,
  targetY,
}: {
  label: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}) {
  const offsetX = (x - targetX) * LABEL_OFFSET_SCALE;
  const offsetY = (y - targetY) * LABEL_OFFSET_SCALE;

  // Drawn around the point it labels, so scaling it up on small screens also
  // moves the label clear of the (equally scaled) shape.
  return (
    <motion.g animate={{ x: targetX, y: targetY }} initial={false} transition={SWIFT_TRANSITION}>
      <g className={NODE_SCALE}>
        <motion.line
          animate={{ x1: offsetX, y1: offsetY }}
          initial={false}
          transition={SWIFT_TRANSITION}
          x2={0}
          y2={0}
          stroke="black"
          strokeDasharray="4 3"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <motion.g
          animate={{ x: offsetX, y: offsetY }}
          initial={false}
          transition={SWIFT_TRANSITION}
        >
          <rect x="-0.35" y="-0.35" width="0.7" height="0.7" className="fill-gray-12" />
          <text
            className="fill-gray-1 font-sans"
            fontSize="0.4"
            fontWeight="600"
            textAnchor="middle"
            dy="0.35em"
          >
            {label}
          </text>
        </motion.g>
      </g>
    </motion.g>
  );
}
