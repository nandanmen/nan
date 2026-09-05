import {
  littleInternetVisual,
  littleInternetVisualWithSixthNode,
  useVisual,
  type ScenePoint as ScenePointData,
} from "./little-internet.scenes";
import { useAtomValue } from "jotai";
import { sixthNodeAddedAtom } from "./little-internet-events";

export function LittleInternet() {
  const sixthNodeAdded = useAtomValue(sixthNodeAddedAtom);
  const scene = useVisual(
    sixthNodeAdded ? littleInternetVisualWithSixthNode : littleInternetVisual,
  );
  const links = scene.flatMap((from, index) => scene.slice(index + 1).map((to) => ({ from, to })));

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

function ScenePoint({ point }: { point: ScenePointData }) {
  const triangleHeight = Math.sqrt(3) / 2;

  switch (point.shape) {
    case "circle":
      return (
        <circle
          cx={point.x}
          cy={point.y}
          className={`${point.className} stroke-current`}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          r="0.4"
        />
      );
    case "square":
      return (
        <rect
          x={point.x - 0.4}
          y={point.y - 0.4}
          className={`${point.className} stroke-current`}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          width="0.8"
          height="0.8"
        />
      );
    case "triangle":
      return (
        <polygon
          transform={`translate(${point.x} ${point.y})`}
          points={`0,${(-2 * triangleHeight) / 3} 0.5,${triangleHeight / 3} -0.5,${triangleHeight / 3}`}
          className={`${point.className} stroke-current`}
          strokeWidth="3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    case "diamond":
      return (
        <polygon
          transform={`translate(${point.x} ${point.y})`}
          points="0,-0.6 0.48,0 0,0.6 -0.48,0"
          className={`${point.className} stroke-current`}
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
      <rect x={x - 0.45} y={y - 0.45} width="0.9" height="0.9" rx="0.1" className="fill-gray-12" />
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
