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
  {
    points: {
      a: { x: 4, y: 2 },
      b: { x: 2, y: 6 },
      c: { x: 6, y: 6 },
      d: { x: 2, y: 3 },
      e: { x: 6, y: 3 },
    },
    lines: [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
      { from: "a", to: "d" },
      { from: "a", to: "e" },
      { from: "b", to: "c" },
      { from: "b", to: "d" },
      { from: "b", to: "e" },
      { from: "c", to: "d" },
      { from: "c", to: "e" },
      { from: "d", to: "e" },
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
    <div
      data-active-section={activeSection}
      className="outline outline-blue-9"
    >
      <svg
        aria-labelledby="little-internet-grid-title"
        className="block size-full overflow-visible"
        fill="none"
        role="img"
        stroke="currentColor"
        viewBox="0 0 8 8"
      >
        {scene.lines.map((line) => {
          const from = scene.points[line.from];
          const to = scene.points[line.to];
          if (!from || !to) return null;

          return <Line key={`${line.from}-${line.to}`} from={[from.x, from.y]} to={[to.x, to.y]} />;
        })}
        {activeSection === 0 && (
          <g fill="currentColor" fontSize={0.3} className="font-sans">
            <line
              x1={4.2}
              x2={4.6}
              y1={2}
              y2={2}
              vectorEffect="non-scaling-stroke"
              strokeWidth="2"
            />
            <text x={4.8} y={2} stroke="none" dominantBaseline="middle">
              1
            </text>
            <line
              x1={4.2}
              x2={4.6}
              y1={6}
              y2={6}
              vectorEffect="non-scaling-stroke"
              strokeWidth="2"
            />
            <text x={4.8} y={6} stroke="none" dominantBaseline="middle">
              2
            </text>
          </g>
        )}
        {Object.entries(scene.points).map(([id, point]) => (
          <Point key={id} x={point.x} y={point.y} />
        ))}
      </svg>
    </div>
  );
}
