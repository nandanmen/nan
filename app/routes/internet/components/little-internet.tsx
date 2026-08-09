import { useActiveSection } from "../../../components/scroller";

type Coord = [number, number];

export function Line({ from, to }: { from: Coord; to: Coord }) {
  const [x1, y1] = from;
  const [x2, y2] = to;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      vectorEffect="non-scaling-stroke"
      stroke="currentColor"
      strokeWidth="4"
    />
  );
}

export function Point({ x, y }: { x: number; y: number }) {
  return (
    <circle
      cx={x}
      cy={y}
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
  const isNetwork = activeSection === 1;
  const lowerX = isNetwork ? 2 : 4;

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
        <Line from={[4, 2]} to={[lowerX, 6]} />
        {isNetwork && (
          <>
            <Line from={[4, 2]} to={[6, 6]} />
            <Line from={[lowerX, 6]} to={[6, 6]} />
          </>
        )}
        <Point x={4} y={2} />
        {isNetwork && <Point x={6} y={6} />}
        <Point x={lowerX} y={6} />
      </svg>
    </div>
  );
}
