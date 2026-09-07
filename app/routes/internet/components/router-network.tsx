import {
  useVisual,
  type SceneDefinition,
  type ScenePoint,
  type Visual,
} from "../../../hooks/use-visual";
import { useScrollerEvent, type ScrollerEvent } from "../../../components/scroller";
import { motion, useAnimate } from "motion/react";
import { useLayoutEffect, useRef } from "react";

const scenes: SceneDefinition[] = [
  {
    one: { x: 8, y: 3, label: { x: 8, y: 1.5, text: "1" } },
    four: { x: 11, y: 5, label: { x: 12.5, y: 5, text: "4" } },
    three: { x: 10, y: 9, label: { x: 11.5, y: 10.5, text: "3" } },
    two: { x: 6, y: 9, label: { x: 4.5, y: 10.5, text: "2" } },
    five: { x: 5, y: 5, label: { x: 3.5, y: 5, text: "5" } },
    routerOne: { x: 8, y: 6 },
  },
  {
    one: { x: 2, y: 4, label: { x: 1.8, y: 2.5, text: "1.1" } },
    two: { x: 2, y: 12, label: { x: 1.8, y: 13.5, text: "1.2" } },
    three: { x: 6.5, y: 8, label: { x: 6.5, y: 6.5, text: "1.3" } },
    routerOne: {
      x: 4,
      y: 8,
      label: { x: 4, y: 9.5, text: "R1" },
    },
    four: { x: 14, y: 4, label: { x: 14, y: 2.5, text: "2.1" } },
    five: { x: 14, y: 12, label: { x: 14, y: 13.5, text: "2.2" } },
    six: { x: 9.5, y: 8, label: { x: 9.5, y: 6.5, text: "2.3" } },
    routerTwo: {
      x: 12,
      y: 8,
      label: { x: 12, y: 9.5, text: "R2" },
    },
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

const PACKET_TRANSITION = {
  type: "tween",
  duration: 0.4,
  ease: "linear",
} as const;

const PACKET_ROTATION_TRANSITION = { duration: 0 } as const;

const LABEL_OFFSET_SCALE = 0.75;
const ROUTER_DOT_DELAY = 0.15;

type RouterDot = 0 | 1 | 2 | 3;
const ROUTER_DOT_POSITIONS = [
  { x: -0.16, y: -0.16 },
  { x: 0.16, y: -0.16 },
  { x: -0.16, y: 0.16 },
  { x: 0.16, y: 0.16 },
] as const;

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

function packetRotation(from: ScenePoint, to: ScenePoint): number {
  const direction = Math.atan2(to.y - from.y, to.x - from.x);
  return (direction * 180) / Math.PI - 90;
}

function routerDotForDirection(router: ScenePoint, point: ScenePoint): RouterDot {
  const direction = Math.atan2(point.y - router.y, point.x - router.x);

  if (direction < -Math.PI / 2) return 0;
  if (direction < 0) return 1;
  if (direction < Math.PI / 2) return 3;
  return 2;
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

export function RouterNetwork() {
  const scene = useVisual(routerNetworkVisual);
  const previousPoints = useRef(new Map<string, ScenePoint>());
  const [scope, animate] = useAnimate();
  const animationRef = useRef<{ stop: () => void } | null>(null);

  const runPacketAnimation = (from: ScenePoint, router: ScenePoint, to: ScenePoint) => {
    animationRef.current?.stop();

    const firstRotation = packetRotation(from, router);
    const secondRotation = packetRotation(router, to);
    const incomingDot = routerDotForDirection(router, from);
    const outgoingDot = routerDotForDirection(router, to);
    const packetSelector = "[data-packet]";
    const incomingDotSelector = `[data-point-id="${router.id}"] [data-router-dot="${incomingDot}"]`;
    const outgoingDotSelector = `[data-point-id="${router.id}"] [data-router-dot="${outgoingDot}"]`;

    animationRef.current = animate(
      [
        [packetSelector, { opacity: 0 }, { duration: 0, at: 0 }],
        [packetSelector, { x: from.x, y: from.y, rotate: firstRotation }, { duration: 0, at: 0 }],
        ["[data-router-dot]", { opacity: 0 }, { duration: 0, at: 0 }],
        [packetSelector, { opacity: 1 }, { duration: 0, at: 0 }],
        [packetSelector, { x: router.x, y: router.y }, PACKET_TRANSITION],
        [incomingDotSelector, { opacity: 1 }, { duration: 0 }],
        [outgoingDotSelector, { opacity: 1 }, { duration: 0, at: `+${ROUTER_DOT_DELAY}` }],
        [
          packetSelector,
          { x: to.x, y: to.y },
          { ...PACKET_TRANSITION, at: `+${ROUTER_DOT_DELAY}` },
        ],
        [packetSelector, { rotate: secondRotation }, { ...PACKET_ROTATION_TRANSITION, at: "<" }],
        [packetSelector, { opacity: 0 }, { duration: 0 }],
        ["[data-router-dot]", { opacity: 0 }, { duration: 0, at: "<" }],
      ],
      {
        onComplete: () => {
          animationRef.current = null;
        },
      },
    );
  };

  useScrollerEvent((event) => {
    if (!isSendPacketEvent(event)) return;

    const from = scene.find((point) => point.id === event.from);
    const router = scene.find((point) => point.id === "routerOne");
    const to = scene.find((point) => point.id === event.to);
    if (!from || !router || !to) return;

    runPacketAnimation(from, router, to);
  });

  useLayoutEffect(() => {
    previousPoints.current = new Map(scene.map((point) => [point.id, point]));
  }, [scene]);

  const links = getConnections(scene);

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
              strokeWidth="6"
            />
          ))}
        </g>
        <motion.g data-packet style={{ opacity: 0 }}>
          <ellipse
            rx="0.2"
            ry="0.3"
            className="fill-blue-9 text-gray-1"
            stroke="currentColor"
            vectorEffect="non-scaling-stroke"
            strokeWidth="2"
          />
        </motion.g>
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
          <ScenePoint key={point.id} point={point} />
        ))}
      </svg>
    </div>
  );
}

function ScenePoint({ point }: { point: ScenePoint }) {
  return (
    <motion.g
      animate={{ x: point.x, y: point.y }}
      data-point-id={point.id}
      initial={false}
      transition={SWIFT_TRANSITION}
    >
      <Shape type={point.shape} className={point.className} />
    </motion.g>
  );
}

function Shape({ type, className }: { type: ScenePoint["shape"]; className?: string }) {
  const triangleHeight = Math.sqrt(3) / 2;
  switch (type) {
    case "circle":
      return (
        <circle
          className={`${className} stroke-current`}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          r="0.4"
        />
      );
    case "square":
      return (
        <rect
          x="-0.4"
          y="-0.4"
          className={`${className} stroke-current`}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          width="0.8"
          height="0.8"
        />
      );
    case "triangle":
      return (
        <polygon
          points={`0,${(-2 * triangleHeight) / 3} 0.5,${triangleHeight / 3} -0.5,${triangleHeight / 3}`}
          className={`${className} stroke-current`}
          strokeWidth="3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    case "diamond":
      return (
        <polygon
          points="0,-0.6 0.48,0 0,0.6 -0.48,0"
          className={`${className} stroke-current`}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      );
    case "router":
      return (
        <>
          <rect
            width="1"
            height="1"
            x="-0.5"
            y="-0.5"
            rx="0.2"
            className={`${className} stroke-current`}
            vectorEffect="non-scaling-stroke"
            strokeWidth="3"
          />
          <g>
            {ROUTER_DOT_POSITIONS.map(({ x, y }, index) => (
              <g key={`${x}-${y}`}>
                <circle cx={x} cy={y} r="0.1" className="fill-gray-8" />
                <circle
                  data-router-dot={index}
                  cx={x}
                  cy={y}
                  r="0.1"
                  className="fill-blue-9"
                  opacity="0"
                />
              </g>
            ))}
          </g>
        </>
      );
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
  const labelX = targetX + (x - targetX) * LABEL_OFFSET_SCALE;
  const labelY = targetY + (y - targetY) * LABEL_OFFSET_SCALE;

  return (
    <g>
      <motion.line
        animate={{
          x1: labelX,
          y1: labelY,
          x2: targetX,
          y2: targetY,
        }}
        initial={false}
        transition={SWIFT_TRANSITION}
        className="text-gray-11"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <motion.g animate={{ x: labelX, y: labelY }} initial={false} transition={SWIFT_TRANSITION}>
        <rect x="-0.35" y="-0.35" width="0.7" height="0.7" rx="0.08" className="fill-gray-12" />
        <text
          className="fill-gray-1 font-sans"
          fontSize="0.4"
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {label}
        </text>
      </motion.g>
    </g>
  );
}
