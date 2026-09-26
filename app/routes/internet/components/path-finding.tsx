import { motion, useAnimate } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useScroller, useScrollerEvent } from "../../../components/scroller";
import {
  clearRoute,
  LinkFills,
  NODE_SCALE,
  routeSequence,
  RouterShape,
  type RoutePoint,
  type RouterBadge,
} from "./network";

// Three networks connected in a chain, R1 — R2 — R3, across three scroller sections:
// 0. data from 1.1 to 3.2 has to hop through R2;
// 1. R3 announces its 3.x addresses, which reach R1 through R2's routing table;
// 2. with a direct R1 — R3 link, R1 hears about 3.x twice.

type Point = { x: number; y: number };
type Shape = "circle" | "square" | "triangle";
type RouterId = "r1" | "r2" | "r3";
type ComputerId = "c11" | "c12" | "c21" | "c31" | "c32";
type NodeId = RouterId | ComputerId;

type Computer = {
  id: ComputerId;
  shape: Shape;
  fill: string;
  stroke: string;
  router: RouterId;
  label?: string;
};

const ROUTER_IDS: RouterId[] = ["r1", "r2", "r3"];

// Each router's card uses its network's color.
const ROUTER_BADGES: Record<RouterId, RouterBadge> = {
  r1: { label: "1", fill: "var(--blue-9)", text: "white" },
  r2: { label: "2", fill: "var(--red-9)", text: "white" },
  r3: { label: "3", fill: "var(--green-9)", text: "white" },
};

const ACTIVE_STROKE = "var(--gray-12)";
const INACTIVE = { fill: "var(--gray-6)", stroke: "var(--gray-8)" };

// Only the endpoints we talk about in the text get a color and a label.
const computers: Computer[] = [
  {
    id: "c11",
    shape: "circle",
    fill: "var(--blue-7)",
    stroke: ACTIVE_STROKE,
    router: "r1",
    label: "1.1",
  },
  { id: "c12", shape: "square", ...INACTIVE, router: "r1" },
  { id: "c21", shape: "triangle", ...INACTIVE, router: "r2" },
  { id: "c31", shape: "circle", ...INACTIVE, router: "r3" },
  {
    id: "c32",
    shape: "square",
    fill: "var(--green-9)",
    stroke: ACTIVE_STROKE,
    router: "r3",
    label: "3.2",
  },
];

type Scene = {
  positions: Record<NodeId, Point>;
  labels: Partial<Record<ComputerId, Point>>;
  // Routing tables under each router.
  tables: boolean;
  // A direct link between R1 and R3, curving under R2.
  directLink: boolean;
};

// The chain, with computers fanned above and below each router.
const CHAIN: Scene = {
  positions: {
    r1: { x: 4, y: 8 },
    r2: { x: 8, y: 8 },
    r3: { x: 12, y: 8 },
    c11: { x: 2, y: 5 },
    c12: { x: 2, y: 11 },
    c21: { x: 8, y: 11 },
    c31: { x: 14, y: 5 },
    c32: { x: 14, y: 11 },
  },
  labels: { c11: { x: 2, y: 3.5 }, c32: { x: 14, y: 12.5 } },
  tables: false,
  directLink: false,
};

// The same chain with computers moved above the routers to make room for tables.
const WITH_TABLES: Scene = {
  positions: {
    r1: { x: 3, y: 8 },
    r2: { x: 8, y: 8 },
    r3: { x: 13, y: 8 },
    c11: { x: 1.5, y: 5 },
    c12: { x: 4.5, y: 5 },
    c21: { x: 8, y: 5 },
    c31: { x: 11.5, y: 5 },
    c32: { x: 14.5, y: 5 },
  },
  labels: { c11: { x: 1.5, y: 3.5 }, c32: { x: 14.5, y: 3.5 } },
  tables: true,
  directLink: false,
};

const SCENES: Scene[] = [CHAIN, WITH_TABLES, { ...WITH_TABLES, directLink: true }];

// Buttons each section's text can use.
const SECTION_EVENTS = [["send-packet"], ["announce", "share-routes"], ["announce"]];

const SWIFT_TRANSITION = { type: "spring", stiffness: 280, damping: 18, mass: 0.3 } as const;
const LABEL_OFFSET_SCALE = 0.75;

// Announcements travel this many seconds per unit of link, and wait at a router
// before being passed on.
const ANNOUNCEMENT_SECONDS_PER_UNIT = 0.1;
const ANNOUNCEMENT_FORWARD_DELAY = 0.3;

// The curved R1 — R3 link bends down to this control point, under R2.
const DIRECT_LINK_CONTROL = { x: 8, y: 11.2 };
const DIRECT_LINK_SAMPLES = 24;

// Routing tables sit under their router.
const TABLE_TOP = 10.4;
const TABLE_WIDTH = 4.2;
const TABLE_PADDING = 0.25;
const TABLE_ROW_HEIGHT = 0.75;

type Route = { prefix: string; via: RouterId };

type Announcement = {
  id: number;
  prefix: string;
  from: RouterId;
  to: RouterId;
  delay: number;
  // Where each router passes this announcement on to once it arrives.
  forward: Partial<Record<RouterId, RouterId[]>>;
};

// R1 and R2 are directly connected, so each already knows how to reach the
// other's network. R3 has just started up and knows nothing yet.
const INITIAL_TABLES: Record<RouterId, Route[]> = {
  r1: [{ prefix: "2.x", via: "r2" }],
  r2: [{ prefix: "1.x", via: "r1" }],
  r3: [],
};

// The network each prefix belongs to, which colors its announcements.
const PREFIX_ROUTER: Record<string, RouterId> = { "1.x": "r1", "2.x": "r2", "3.x": "r3" };

function quadraticPoint(from: Point, control: Point, to: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}

function directLinkPath(r1: Point, r3: Point) {
  return `M ${r1.x} ${r1.y} Q ${DIRECT_LINK_CONTROL.x} ${DIRECT_LINK_CONTROL.y} ${r3.x} ${r3.y}`;
}

// Points an announcement passes through between two neighboring routers.
function announcementPath(scene: Scene, from: RouterId, to: RouterId): Point[] {
  const start = scene.positions[from];
  const end = scene.positions[to];
  const isDirect = (from === "r1" && to === "r3") || (from === "r3" && to === "r1");
  if (!isDirect) return [start, end];
  return Array.from({ length: DIRECT_LINK_SAMPLES + 1 }, (_, i) =>
    quadraticPoint(start, DIRECT_LINK_CONTROL, end, i / DIRECT_LINK_SAMPLES),
  );
}

function pathLength(points: Point[]) {
  return points.slice(1).reduce((length, point, i) => {
    const prev = points[i];
    return length + Math.hypot(point.x - prev.x, point.y - prev.y);
  }, 0);
}

export function PathFinding() {
  const { activeSection, setAvailableEvents } = useScroller();
  const sceneIndex = Math.min(activeSection, SCENES.length - 1);
  const scene = SCENES[sceneIndex];
  const [scope, animate] = useAnimate();
  const animationRef = useRef<{ stop: () => void } | null>(null);
  const [tables, setTables] = useState(INITIAL_TABLES);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    setAvailableEvents({ index: activeSection, types: SECTION_EVENTS[sceneIndex] ?? [] });
    return () => setAvailableEvents(null);
  }, [activeSection, sceneIndex, setAvailableEvents]);

  // Each section starts from a clean slate: no drawn route, no announcements, empty tables.
  useLayoutEffect(() => {
    animationRef.current?.stop();
    animationRef.current = null;
    clearRoute(animate);
    setTables(INITIAL_TABLES);
    setAnnouncements([]);
  }, [sceneIndex, animate]);

  const send = () => {
    const { positions } = scene;
    const path: RoutePoint[] = [
      positions.c11,
      ...ROUTER_IDS.map((id) => ({ ...positions[id], routerId: id })),
      positions.c32,
    ];
    animationRef.current?.stop();
    clearRoute(animate);
    animationRef.current = animate(routeSequence(path), {
      onComplete: () => {
        animationRef.current = null;
      },
    });
  };

  const announce = (
    prefix: string,
    from: RouterId,
    to: RouterId[],
    forward: Announcement["forward"] = {},
    delay = 0,
  ) => {
    setAnnouncements((current) => [
      ...current,
      ...to.map((target) => ({
        id: nextId.current++,
        prefix,
        from,
        to: target,
        delay,
        forward,
      })),
    ]);
  };

  const arrive = (announcement: Announcement) => {
    const { prefix, from, to, forward } = announcement;
    setAnnouncements((current) => [
      ...current.filter(({ id }) => id !== announcement.id),
      // Pass the announcement on, now coming from this router.
      ...(forward[to] ?? []).map((target) => ({
        id: nextId.current++,
        prefix,
        from: to,
        to: target,
        delay: ANNOUNCEMENT_FORWARD_DELAY,
        forward,
      })),
    ]);
    setTables((current) => {
      const routes = current[to];
      if (routes.some((route) => route.prefix === prefix && route.via === from)) return current;
      return { ...current, [to]: [...routes, { prefix, via: from }] };
    });
  };

  useScrollerEvent((event, index) => {
    if (index !== activeSection) return;

    if (event.type === "send-packet" && sceneIndex === 0) {
      send();
    } else if (event.type === "announce") {
      // R3 tells its neighbors it can receive 3.x, and R2 passes that on to R1.
      setTables(INITIAL_TABLES);
      setAnnouncements([]);
      announce("3.x", "r3", scene.directLink ? ["r2", "r1"] : ["r2"], { r2: ["r1"] });
    } else if (event.type === "share-routes") {
      // R2 already knows about R1, so it tells R3 how to reach both 2.x and 1.x.
      announce("2.x", "r2", ["r3"]);
      announce("1.x", "r2", ["r3"], {}, ANNOUNCEMENT_FORWARD_DELAY);
    }
  });

  const { positions } = scene;
  const links: [Point, Point][] = [
    ...computers.map((c): [Point, Point] => [positions[c.id], positions[c.router]]),
    [positions.r1, positions.r2],
    [positions.r2, positions.r3],
  ];

  return (
    <div className="w-full">
      <svg
        ref={scope}
        aria-label="Three networks connected in a chain of routers"
        className="block w-full h-auto aspect-square overflow-visible"
        fill="none"
        role="img"
        viewBox="0 0 16 16"
      >
        <g stroke="currentColor" className="text-gray-7">
          {links.map(([from, to], i) => (
            <motion.line
              key={i}
              initial={false}
              animate={{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }}
              transition={SWIFT_TRANSITION}
              vectorEffect="non-scaling-stroke"
              strokeWidth="6"
            />
          ))}
          <motion.path
            d={directLinkPath(WITH_TABLES.positions.r1, WITH_TABLES.positions.r3)}
            initial={false}
            animate={{ opacity: scene.directLink ? 1 : 0 }}
            vectorEffect="non-scaling-stroke"
            strokeWidth="6"
          />
        </g>

        <LinkFills count={4} />

        {announcements.map((announcement) => (
          <AnnouncementBadge
            key={announcement.id}
            announcement={announcement}
            path={announcementPath(scene, announcement.from, announcement.to)}
            onArrive={() => arrive(announcement)}
          />
        ))}

        {computers.map((c) => {
          const label = scene.labels[c.id];
          return (
            c.label &&
            label && (
              <VertexLabel
                key={`label-${c.id}`}
                text={c.label}
                x={label.x}
                y={label.y}
                targetX={positions[c.id].x}
                targetY={positions[c.id].y}
              />
            )
          );
        })}

        {computers.map((c) => (
          <motion.g
            key={c.id}
            initial={false}
            animate={{ x: positions[c.id].x, y: positions[c.id].y }}
            transition={SWIFT_TRANSITION}
          >
            <g className={NODE_SCALE}>
              <ComputerShape shape={c.shape} fill={c.fill} stroke={c.stroke} />
            </g>
          </motion.g>
        ))}
        {ROUTER_IDS.map((id) => (
          <motion.g
            key={id}
            data-router={id}
            initial={false}
            animate={{ x: positions[id].x, y: positions[id].y }}
            transition={SWIFT_TRANSITION}
          >
            <g className={NODE_SCALE}>
              <RouterShape badge={ROUTER_BADGES[id]} />
            </g>
          </motion.g>
        ))}

        <motion.g initial={false} animate={{ opacity: scene.tables ? 1 : 0 }}>
          {ROUTER_IDS.map((id) => (
            <RoutingTable
              key={id}
              x={WITH_TABLES.positions[id].x - TABLE_WIDTH / 2}
              y={TABLE_TOP}
              routes={tables[id]}
            />
          ))}
        </motion.g>
      </svg>
    </div>
  );
}

function AnnouncementBadge({
  announcement,
  path,
  onArrive,
}: {
  announcement: Announcement;
  path: Point[];
  onArrive: () => void;
}) {
  const color = ROUTER_BADGES[PREFIX_ROUTER[announcement.prefix] ?? "r3"].fill;
  return (
    <motion.g
      initial={{ x: path[0].x, y: path[0].y }}
      animate={{ x: path.map((point) => point.x), y: path.map((point) => point.y) }}
      transition={{
        duration: pathLength(path) * ANNOUNCEMENT_SECONDS_PER_UNIT,
        delay: announcement.delay,
        ease: "linear",
      }}
      onAnimationComplete={onArrive}
    >
      <g className={NODE_SCALE}>
        <rect
          x="-0.5"
          y="-0.28"
          width="1"
          height="0.56"
          rx="0.28"
          style={{ fill: color, stroke: "white" }}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <text
          style={{ fill: "white" }}
          className="font-sans"
          fontSize="0.32"
          fontWeight="700"
          textAnchor="middle"
          dy="0.35em"
        >
          {announcement.prefix}
        </text>
      </g>
    </motion.g>
  );
}

function RoutingTable({ x, y, routes }: { x: number; y: number; routes: Route[] }) {
  const rows = Math.max(routes.length, 1);
  const height = TABLE_PADDING * 2 + rows * TABLE_ROW_HEIGHT;
  // Two routes for the same prefix leave the router with a choice to make.
  const isConflicting = (prefix: string) =>
    routes.filter((route) => route.prefix === prefix).length > 1;

  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.rect
        width={TABLE_WIDTH}
        initial={false}
        animate={{ height }}
        transition={SWIFT_TRANSITION}
        rx="0.15"
        style={{ fill: "white", stroke: "var(--gray-7)" }}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {routes.length === 0 && (
        <text
          x={TABLE_PADDING + 0.1}
          y={TABLE_PADDING + TABLE_ROW_HEIGHT / 2}
          style={{ fill: "var(--gray-9)" }}
          className="font-sans"
          fontSize="0.36"
          dy="0.35em"
        >
          No routes yet
        </text>
      )}
      {routes.map((route, i) => (
        <motion.g
          key={`${route.prefix}-${route.via}`}
          initial={{ opacity: 0, y: TABLE_PADDING + i * TABLE_ROW_HEIGHT - 0.2 }}
          animate={{ opacity: 1, y: TABLE_PADDING + i * TABLE_ROW_HEIGHT }}
          transition={SWIFT_TRANSITION}
        >
          {isConflicting(route.prefix) && (
            <rect
              x="0.1"
              y="0.05"
              width={TABLE_WIDTH - 0.2}
              height={TABLE_ROW_HEIGHT - 0.1}
              rx="0.1"
              style={{ fill: "var(--yellow-4)" }}
            />
          )}
          <text
            x={TABLE_PADDING + 0.1}
            y={TABLE_ROW_HEIGHT / 2}
            style={{ fill: "var(--gray-12)" }}
            className="font-sans"
            fontSize="0.4"
            fontWeight="600"
            dy="0.35em"
          >
            {route.prefix}
          </text>
          <text
            x={TABLE_WIDTH / 2 + 0.15}
            y={TABLE_ROW_HEIGHT / 2}
            style={{ fill: "var(--gray-10)" }}
            className="font-sans"
            fontSize="0.4"
            textAnchor="middle"
            dy="0.35em"
          >
            →
          </text>
          <g transform={`translate(${TABLE_WIDTH - TABLE_PADDING - 0.5} ${TABLE_ROW_HEIGHT / 2})`}>
            <rect
              x="-0.35"
              y="-0.25"
              width="0.7"
              height="0.5"
              rx="0.08"
              style={{ fill: ROUTER_BADGES[route.via].fill }}
            />
            <text
              style={{ fill: ROUTER_BADGES[route.via].text }}
              className="font-sans"
              fontSize="0.3"
              fontWeight="700"
              textAnchor="middle"
              dy="0.35em"
            >
              {ROUTER_BADGES[route.via].label}
            </text>
          </g>
        </motion.g>
      ))}
    </g>
  );
}

function ComputerShape({ shape, fill, stroke }: { shape: Shape; fill: string; stroke: string }) {
  const common = {
    style: { fill, stroke },
    strokeWidth: 3,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const h = Math.sqrt(3) / 2;
  switch (shape) {
    case "circle":
      return <circle r="0.4" {...common} />;
    case "square":
      return <rect x="-0.4" y="-0.4" width="0.8" height="0.8" {...common} />;
    case "triangle":
      return (
        <polygon
          points={`0,${(-2 * h) / 3} 0.5,${h / 3} -0.5,${h / 3}`}
          strokeLinejoin="miter"
          {...common}
        />
      );
  }
}

function VertexLabel({
  text,
  x,
  y,
  targetX,
  targetY,
}: {
  text: string;
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
    <motion.g initial={false} animate={{ x: targetX, y: targetY }} transition={SWIFT_TRANSITION}>
      <g className={NODE_SCALE}>
        <motion.line
          initial={false}
          animate={{ x1: offsetX, y1: offsetY }}
          transition={SWIFT_TRANSITION}
          x2={0}
          y2={0}
          className="text-gray-11"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <motion.g
          initial={false}
          animate={{ x: offsetX, y: offsetY }}
          transition={SWIFT_TRANSITION}
        >
          <rect
            x="-0.35"
            y="-0.35"
            width="0.7"
            height="0.7"
            rx="0.08"
            style={{ fill: "var(--gray-12)" }}
          />
          <text
            style={{ fill: "var(--gray-1)" }}
            className="font-sans"
            fontSize="0.4"
            fontWeight="600"
            textAnchor="middle"
            dy="0.35em"
          >
            {text}
          </text>
        </motion.g>
      </g>
    </motion.g>
  );
}
