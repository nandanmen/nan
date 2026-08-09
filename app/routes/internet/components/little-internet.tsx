import { motion } from "motion/react";
import { useActiveSection } from "../../../components/scroller";

type Coord = [number, number];

type ScenePoint = {
  x: number;
  y: number;
};

type SceneLine = {
  from: string;
  to: string;
};

type Scene = {
  points: Record<string, ScenePoint>;
  lines: SceneLine[];
};

const scenes: Scene[] = [
  {
    points: {
      a: { x: 4, y: 2 },
      b: { x: 4, y: 6 },
    },
    lines: [{ from: "a", to: "b" }],
  },
  {
    points: {
      a: { x: 4, y: 2 },
      b: { x: 2, y: 6 },
      c: { x: 6, y: 6 },
    },
    lines: [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
      { from: "b", to: "c" },
    ],
  },
];

export function Line({ from, to }: { from: Coord; to: Coord }) {
  const [x1, y1] = from;
  const [x2, y2] = to;

  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      animate={{ x1, y1, x2, y2 }}
      initial={false}
      vectorEffect="non-scaling-stroke"
      stroke="currentColor"
      strokeWidth="4"
    />
  );
}

export function Point({ x, y }: { x: number; y: number }) {
  return (
    <motion.circle
      cx={x}
      cy={y}
      animate={{ cx: x, cy: y }}
      initial={false}
      r={0.2}
      fill="white"
      stroke="currentColor"
      vectorEffect="non-scaling-stroke"
      strokeWidth="8"
    />
  );
}

export function LittleInternet() {
  const activeSection = useActiveSection();
  const scene = scenes[activeSection] ?? scenes[0];

  return (
    <div data-active-section={activeSection}>
      <svg
        aria-labelledby="little-internet-grid-title"
        className="size-full"
        fill="none"
        role="img"
        stroke="currentColor"
        viewBox="-0.025 -0.025 8.05 8.05"
      >
        <title id="little-internet-grid-title">Eight by eight grid</title>
        <rect
          x={0}
          y={0}
          width={8}
          height={8}
          fill="white"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
        />
        <g className="stroke-gray-4">
          {Array.from({ length: 7 }, (_, index) => (
            <line
              key={`vertical-${index}`}
              x1={index + 1}
              x2={index + 1}
              y1={0}
              y2={8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {Array.from({ length: 7 }, (_, index) => (
            <line
              key={`horizontal-${index}`}
              x1={0}
              x2={8}
              y1={index + 1}
              y2={index + 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        {scene.lines.map((line) => {
          const from = scene.points[line.from];
          const to = scene.points[line.to];
          if (!from || !to) return null;

          return <Line key={`${line.from}-${line.to}`} from={[from.x, from.y]} to={[to.x, to.y]} />;
        })}
        {Object.entries(scene.points).map(([id, point]) => (
          <Point key={id} x={point.x} y={point.y} />
        ))}
      </svg>
    </div>
  );
}
