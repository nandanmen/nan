import { useActiveSection } from "../../../components/scroller";
import { useAtomValue } from "jotai";
import { littleInternetEventAtom } from "./little-internet-events";

export type PointDefinition = {
  shape: "circle" | "square" | "triangle" | "diamond";
  className: string;
  label?: string;
};

export type Point = {
  x: number;
  y: number;
  label?: { x: number; y: number };
};

export type PointMap = Record<string, Point>;

export type SceneDefinition =
  | PointMap
  | {
      initial: PointMap;
      on: Record<string, SceneDefinition>;
    };

export type Visual = {
  points: Record<string, PointDefinition>;
  scenes: SceneDefinition[];
};

export type ScenePoint = {
  id: string;
  x: number;
  y: number;
  shape: "circle" | "square" | "triangle" | "diamond";
  className: string;
  label?: {
    text: string;
    x: number;
    y: number;
  };
};

export type Scene = ScenePoint[];

export function useVisual(visual: Visual): Scene {
  const activeSection = useActiveSection();
  const event = useAtomValue(littleInternetEventAtom);
  const definition = visual.scenes[activeSection] ?? visual.scenes[0];
  if (!definition) return [];

  const scene = resolveScene(definition, event?.type);

  return Object.entries(scene).map(([id, point]) => {
    const visualPoint = visual.points[id];

    if (!visualPoint) {
      throw new Error(`Visual point "${id}" is not defined.`);
    }

    return {
      id,
      x: point.x,
      y: point.y,
      shape: visualPoint.shape,
      className: visualPoint.className,
      ...(point.label && {
        label: {
          text: visualPoint.label ?? id,
          x: point.label.x,
          y: point.label.y,
        },
      }),
    };
  });
}

function resolveScene(definition: SceneDefinition, eventType?: string): PointMap {
  if (isTransitionDefinition(definition)) {
    const nextDefinition = eventType ? definition.on[eventType] : undefined;
    return nextDefinition ? resolveScene(nextDefinition, eventType) : definition.initial;
  }

  return definition;
}

function isTransitionDefinition(
  definition: SceneDefinition,
): definition is Exclude<SceneDefinition, PointMap> {
  return "initial" in definition && "on" in definition;
}

const fiveComputerScene: PointMap = {
  one: { x: 8, y: 3, label: { x: 8, y: 1.5 } },
  four: { x: 11, y: 5, label: { x: 12.5, y: 5 } },
  three: { x: 10, y: 9, label: { x: 11.5, y: 10.5 } },
  two: { x: 6, y: 9, label: { x: 4.5, y: 10.5 } },
  five: { x: 5, y: 5, label: { x: 3.5, y: 5 } },
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
  {
    initial: fiveComputerScene,
    on: {
      add: {
        ...fiveComputerScene,
        six: { x: 8, y: 12, label: { x: 8, y: 13.5 } },
      },
    },
  },
];

export const littleInternetVisual: Visual = {
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
