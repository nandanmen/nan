import {
  useVisual,
  type SceneDefinition,
  type ScenePoint,
  type Visual,
} from "../../../hooks/use-visual";
import {
  useScrollerEvent,
  type ScrollerEvent,
} from "../../../components/scroller";
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

const pentagonScene: SceneDefinition = {
  initial: {
    one: { x: 8, y: 3, label: { x: 8, y: 1.5 } },
    four: { x: 11, y: 5, label: { x: 12.5, y: 5 } },
    three: { x: 10, y: 9, label: { x: 11.5, y: 10.5 } },
    two: { x: 6, y: 9, label: { x: 4.5, y: 10.5 } },
    five: { x: 5, y: 5, label: { x: 3.5, y: 5 } },
    six: null,
    seven: null,
  },
  on: {
    add: {
      initial: {
        one: { x: 8, y: 3, label: { x: 8, y: 1.5 } },
        four: { x: 11, y: 5, label: { x: 12.5, y: 5 } },
        three: { x: 11, y: 9, label: { x: 12.5, y: 10.5 } },
        six: { x: 8, y: 11, label: { x: 8, y: 12.5 } },
        two: { x: 5, y: 9, label: { x: 3.5, y: 10.5 } },
        five: { x: 5, y: 5, label: { x: 3.5, y: 5 } },
      },
      on: {
        get reset(): SceneDefinition {
          return pentagonScene;
        },
        add: {
          initial: {
            one: { x: 8, y: 3, label: { x: 8, y: 1.5 } },
            four: { x: 11, y: 4.5, label: { x: 12.5, y: 4 } },
            three: { x: 12, y: 8, label: { x: 13.5, y: 8.5 } },
            six: { x: 10, y: 11, label: { x: 10.5, y: 12.5 } },
            seven: { x: 6, y: 11, label: { x: 5.5, y: 12.5 } },
            two: { x: 4, y: 8, label: { x: 2.5, y: 8.5 } },
            five: { x: 5, y: 4.5, label: { x: 3.5, y: 4 } },
          },
          on: {
            get reset(): SceneDefinition {
              return pentagonScene;
            },
          },
        },
      },
    },
  },
};

const scenes: SceneDefinition[] = [
  {
    one: { x: 8, y: 3 },
    two: { x: 8, y: 9 },
  },
  {
    one: { x: 8, y: 3, label: { x: 8, y: 1.5 } },
    two: { x: 5, y: 9, label: { x: 3.5, y: 10.5 } },
    three: { x: 11, y: 9, label: { x: 12.5, y: 10.5 } },
  },
  pentagonScene,
];

const littleInternetVisual: Visual = {
  points: {
    one: { shape: "circle", className: "fill-blue-7", label: "1" },
    two: { shape: "square", className: "fill-yellow-10", label: "2" },
    three: { shape: "triangle", className: "fill-red-8", label: "3" },
    four: { shape: "circle", className: "fill-cyan-9", label: "4" },
    five: { shape: "diamond", className: "fill-green-9", label: "5" },
    six: { shape: "square", className: "fill-blue-9", label: "6" },
    seven: { shape: "triangle", className: "fill-cyan-9", label: "7" },
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
  duration: 0.5,
  ease: "linear",
} as const;

type Packet = {
  id: number;
  from: ScenePoint;
  to: ScenePoint;
};

type SendPacketEvent = ScrollerEvent & {
  type: "send-packet";
  from?: string;
  random?: boolean;
  to?: string;
};

function isSendPacketEvent(event: ScrollerEvent): event is SendPacketEvent {
  return (
    event.type === "send-packet" &&
    (event.random === true ||
      (typeof event.from === "string" && typeof event.to === "string"))
  );
}

function randomConnectedPair(
  scene: ScenePoint[],
): [ScenePoint, ScenePoint] | null {
  if (scene.length < 2) return null;

  const fromIndex = Math.floor(Math.random() * scene.length);
  const toIndex = Math.floor(Math.random() * (scene.length - 1));
  const adjustedToIndex = toIndex >= fromIndex ? toIndex + 1 : toIndex;

  return [scene[fromIndex], scene[adjustedToIndex]];
}

function packetRotation({ from, to }: Packet): number {
  const direction = Math.atan2(to.y - from.y, to.x - from.x);
  return (direction * 180) / Math.PI - 90;
}

export function LittleInternet() {
  const scene = useVisual(littleInternetVisual);
  const previousPoints = useRef(new Map<string, ScenePoint>());
  const [packet, setPacket] = useState<Packet | null>(null);
  const packetId = useRef(0);

  useScrollerEvent((event) => {
    if (!isSendPacketEvent(event)) return;

    const [randomFrom, randomTo] = event.random
      ? (randomConnectedPair(scene) ?? [])
      : [];
    const from = randomFrom ?? scene.find((point) => point.id === event.from);
    const to = randomTo ?? scene.find((point) => point.id === event.to);
    if (!from || !to) return;

    setPacket({ id: packetId.current++, from, to });
  });

  useLayoutEffect(() => {
    previousPoints.current = new Map(scene.map((point) => [point.id, point]));
  }, [scene]);
  const links = scene.flatMap((from, index) =>
    scene.slice(index + 1).map((to) => ({ from, to })),
  );
  const rotation = packet ? packetRotation(packet) : 0;
  return (
    <div className="w-full">
      <svg
        aria-label="Connected computers"
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
        {packet && (
          <motion.g
            key={packet.id}
            animate={{ x: packet.to.x, y: packet.to.y, rotate: rotation }}
            initial={{ x: packet.from.x, y: packet.from.y, rotate: rotation }}
            onAnimationComplete={() =>
              setPacket((current) =>
                current?.id === packet.id ? null : current,
              )
            }
            transition={PACKET_TRANSITION}
          >
            <ellipse
              rx="0.2"
              ry="0.3"
              className="fill-green-9 text-gray-1"
              stroke="currentColor"
              vectorEffect="non-scaling-stroke"
              strokeWidth="2"
            />
          </motion.g>
        )}
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
      initial={false}
      transition={SWIFT_TRANSITION}
    >
      <Shape type={point.shape} className={point.className} />
    </motion.g>
  );
}

function Shape({
  type,
  className,
}: {
  type: ScenePoint["shape"];
  className?: string;
}) {
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
  return (
    <g>
      <motion.line
        animate={{
          x1: x,
          y1: y,
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
      <motion.g
        animate={{ x, y }}
        initial={false}
        transition={SWIFT_TRANSITION}
      >
        <rect
          x="-0.45"
          y="-0.45"
          width="0.9"
          height="0.9"
          rx="0.1"
          className="fill-gray-12"
        />
        <text
          className="fill-gray-1 font-sans"
          fontSize="0.55"
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
