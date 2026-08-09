import { useActiveSection } from "../../../components/scroller";

export function LittleInternet() {
  const activeSection = useActiveSection();
  const isNetwork = activeSection === 1;
  const lowerCircleX = isNetwork ? 2 : 4;

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
        <line
          y1="2"
          x1="4"
          x2={lowerCircleX}
          y2="6"
          vectorEffect="non-scaling-stroke"
          stroke="currentColor"
          strokeWidth="4"
        />
        {isNetwork && (
          <>
            <line
              x1="4"
              x2="6"
              y1="2"
              y2="6"
              vectorEffect="non-scaling-stroke"
              stroke="currentColor"
              strokeWidth="4"
            />
            <line
              x1={lowerCircleX}
              x2="6"
              y1="6"
              y2="6"
              vectorEffect="non-scaling-stroke"
              stroke="currentColor"
              strokeWidth="4"
            />
          </>
        )}
        <circle
          cx={4}
          cy={2}
          r={0.2}
          fill="white"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
          strokeWidth="8"
        />
        {isNetwork && (
          <circle
            cx={6}
            cy={6}
            r={0.2}
            fill="white"
            stroke="currentColor"
            vectorEffect="non-scaling-stroke"
            strokeWidth="8"
          />
        )}
        <circle
          cx={lowerCircleX}
          cy={6}
          r={0.2}
          fill="white"
          stroke="currentColor"
          vectorEffect="non-scaling-stroke"
          strokeWidth="8"
        />
      </svg>
    </div>
  );
}
