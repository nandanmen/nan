import {
  useVisual,
  type SceneDefinition,
  type ScenePoint,
  type Visual,
} from "../../../hooks/use-visual";
import { motion } from "motion/react";

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
  {
    initial: {
      one: { x: 8, y: 3, label: { x: 8, y: 1.5 } },
      four: { x: 11, y: 5, label: { x: 12.5, y: 5 } },
      three: { x: 10, y: 9, label: { x: 11.5, y: 10.5 } },
      two: { x: 6, y: 9, label: { x: 4.5, y: 10.5 } },
      five: { x: 5, y: 5, label: { x: 3.5, y: 5 } },
    },
    on: {
      add: {
        one: { x: 8, y: 3, label: { x: 8, y: 1.5 } },
        four: { x: 11, y: 5, label: { x: 12.5, y: 5 } },
        three: { x: 11, y: 9, label: { x: 12.5, y: 10.5 } },
        six: { x: 8, y: 11, label: { x: 8, y: 12.5 } },
        two: { x: 5, y: 9, label: { x: 3.5, y: 10.5 } },
        five: { x: 5, y: 5, label: { x: 3.5, y: 5 } },
      },
    },
  },
];

const littleInternetVisual: Visual = {
  points: {
    one: { shape: "circle", className: "fill-blue-7", label: "1" },
    two: { shape: "square", className: "fill-yellow-10", label: "2" },
    three: { shape: "triangle", className: "fill-red-8", label: "3" },
    four: { shape: "circle", className: "fill-cyan-9", label: "4" },
    five: { shape: "diamond", className: "fill-green-9", label: "5" },
    six: { shape: "square", className: "fill-blue-9", label: "6" },
  },
  scenes,
};

export function LittleInternet() {
  const scene = useVisual(littleInternetVisual);
  const links = scene.flatMap((from, index) =>
    scene.slice(index + 1).map((to) => ({ from, to })),
  );
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
            <line
              key={`${from.id}-${to.id}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              vectorEffect="non-scaling-stroke"
              strokeWidth="6"
            />
          ))}
        </g>
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
    <motion.g animate={{ x: point.x, y: point.y }} initial={false}>
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
      <line
        x1={x}
        y1={y}
        x2={targetX}
        y2={targetY}
        className="text-gray-11"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={x - 0.45}
        y={y - 0.45}
        width="0.9"
        height="0.9"
        rx="0.1"
        className="fill-gray-12"
      />
      <text
        x={x}
        y={y}
        className="fill-gray-1 font-sans"
        fontSize="0.55"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  );
}
