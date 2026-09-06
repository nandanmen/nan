import { useEffect, useRef, useState } from "react";
import { useScroller, useScrollerEvent } from "../components/scroller";

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

function toScene(points: PointMap, definitions: Record<string, PointDefinition>): Scene {
  return Object.entries(points).map(([id, point]) => {
    const visualPoint = definitions[id];
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

function isTransitionDefinition(
  definition: SceneDefinition,
): definition is Exclude<SceneDefinition, PointMap> {
  return "initial" in definition && "on" in definition;
}

function resolveScene(definition: SceneDefinition): {
  points: PointMap;
  transitions: Record<string, SceneDefinition>;
} {
  return isTransitionDefinition(definition)
    ? { points: definition.initial, transitions: definition.on }
    : { points: definition, transitions: {} };
}

function assertFirstScene(visual: Visual): SceneDefinition {
  const scene = visual.scenes.at(0);
  if (!scene) {
    throw new Error(`Visual must contain at least one scene: ${JSON.stringify(visual)}`);
  }
  return scene;
}

export function useVisual(visual: Visual): Scene {
  const firstScene = resolveScene(assertFirstScene(visual));
  const [points, setPoints] = useState<PointMap>(firstScene.points);
  const transitions = useRef<Record<string, SceneDefinition>>(firstScene.transitions);
  const { activeSection } = useScroller();

  useEffect(() => {
    const nextScene = visual.scenes.at(activeSection);
    if (!nextScene) return;
    const next = resolveScene(nextScene);
    setPoints(next.points);
    transitions.current = next.transitions;
  }, [visual, activeSection]);

  useScrollerEvent((event, index) => {
    if (index !== activeSection) return;
    if (!Object.hasOwn(transitions.current, event.type)) return;
    const nextScene = resolveScene(transitions.current[event.type]);
    transitions.current = nextScene.transitions;
    setPoints((currentPoints) => ({ ...currentPoints, ...nextScene.points }));
  });

  return toScene(points, visual.points);
}
