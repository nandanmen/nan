import { useAnimate } from "motion/react";
import { useId, useRef } from "react";
import { Button } from "../../../components/button";
import {
  clearRoute,
  GridBackground,
  LinkFills,
  NODE_SCALE,
  routeSequence,
  RouterShape,
  type RoutePoint,
  type RouterBadge,
} from "./network";

// Three networks connected in a chain: R1 — R2 — R3.
// Sending from 1.1 to 3.2 has to hop through R2, since R1 and R3 aren't directly connected.
// Each link on the route fills in as the data crosses it, and the route stays drawn at the end.

type Point = { x: number; y: number };
type Shape = "circle" | "square" | "triangle" | "diamond";

type Computer = Point & {
  id: string;
  shape: Shape;
  fill: string;
  stroke: string;
  router: RouterId;
  label?: Point & { text: string };
};

type RouterId = "r1" | "r2" | "r3";
type Router = Point & { id: RouterId };

const routers: Record<RouterId, Router> = {
  r1: { id: "r1", x: 4, y: 8 },
  r2: { id: "r2", x: 8, y: 8 },
  r3: { id: "r3", x: 12, y: 8 },
};

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
    x: 2,
    y: 5,
    shape: "circle",
    fill: "var(--blue-7)",
    stroke: ACTIVE_STROKE,
    router: "r1",
    label: { x: 2, y: 3.5, text: "1.1" },
  },
  { id: "c12", x: 2, y: 11, shape: "square", ...INACTIVE, router: "r1" },
  { id: "c21", x: 8, y: 11, shape: "triangle", ...INACTIVE, router: "r2" },
  { id: "c31", x: 14, y: 5, shape: "circle", ...INACTIVE, router: "r3" },
  {
    id: "c32",
    x: 14,
    y: 11,
    shape: "square",
    fill: "var(--green-9)",
    stroke: ACTIVE_STROKE,
    router: "r3",
    label: { x: 14, y: 12.5, text: "3.2" },
  },
];

const routerLinks: [RouterId, RouterId][] = [
  ["r1", "r2"],
  ["r2", "r3"],
];

const SOURCE = computers.find((c) => c.id === "c11")!;
const DESTINATION = computers.find((c) => c.id === "c32")!;
const PATH: RoutePoint[] = [
  SOURCE,
  ...[routers.r1, routers.r2, routers.r3].map((r) => ({ ...r, routerId: r.id })),
  DESTINATION,
];

const LABEL_OFFSET_SCALE = 0.75;

export function RouterChain() {
  const titleId = useId();
  const [scope, animate] = useAnimate();
  const animationRef = useRef<{ stop: () => void } | null>(null);

  const send = () => {
    animationRef.current?.stop();
    clearRoute(animate);
    animationRef.current = animate(routeSequence(PATH), {
      onComplete: () => {
        animationRef.current = null;
      },
    });
  };

  return (
    <figure className="m-0 grid w-full gap-y-4">
      <Button onClick={send}>Send 1.1 → 3.2</Button>
      <GridBackground>
        <svg
          ref={scope}
          aria-labelledby={titleId}
          role="img"
          viewBox="0 2 16 12"
          fill="none"
          className="block h-auto w-full overflow-visible"
        >
          <title id={titleId}>
            Three networks connected in a chain of routers; data from 1.1 to 3.2 passes through R2
          </title>

          <g stroke="currentColor" className="text-gray-7">
            {computers.map((c) => (
              <line
                key={`link-${c.id}`}
                x1={c.x}
                y1={c.y}
                x2={routers[c.router].x}
                y2={routers[c.router].y}
                vectorEffect="non-scaling-stroke"
                strokeWidth="6"
              />
            ))}
            {routerLinks.map(([a, b]) => (
              <line
                key={`link-${a}-${b}`}
                x1={routers[a].x}
                y1={routers[a].y}
                x2={routers[b].x}
                y2={routers[b].y}
                vectorEffect="non-scaling-stroke"
                strokeWidth="6"
              />
            ))}
          </g>

          <LinkFills count={PATH.length - 1} />

          {computers.map(
            (c) =>
              c.label && (
                <VertexLabel
                  key={`label-${c.id}`}
                  text={c.label.text}
                  x={c.label.x}
                  y={c.label.y}
                  targetX={c.x}
                  targetY={c.y}
                />
              ),
          )}

          {computers.map((c) => (
            <g key={c.id} transform={`translate(${c.x} ${c.y})`}>
              <g className={NODE_SCALE}>
                <ComputerShape shape={c.shape} fill={c.fill} stroke={c.stroke} />
              </g>
            </g>
          ))}
          {Object.values(routers).map((r) => (
            <g key={r.id} data-router={r.id} transform={`translate(${r.x} ${r.y})`}>
              <g className={NODE_SCALE}>
                <RouterShape badge={ROUTER_BADGES[r.id]} />
              </g>
            </g>
          ))}
        </svg>
      </GridBackground>
    </figure>
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
    case "diamond":
      return <polygon points="0,-0.6 0.48,0 0,0.6 -0.48,0" {...common} />;
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
    <g transform={`translate(${targetX} ${targetY})`}>
      <g className={NODE_SCALE}>
        <line
          x1={offsetX}
          y1={offsetY}
          x2={0}
          y2={0}
          className="text-gray-11"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <g transform={`translate(${offsetX} ${offsetY})`}>
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
            dominantBaseline="central"
          >
            {text}
          </text>
        </g>
      </g>
    </g>
  );
}
