import { useActiveSection } from "../../../components/scroller";

export type VisualPoint = {
  shape: "circle" | "square" | "triangle" | "diamond";
  className: string;
  label?: string;
};

export type Point = {
  id: string;
  x: number;
  y: number;
  label?: { x: number; y: number };
};

export type SceneDefinition = Point[];

export type Visual = {
  points: Record<string, VisualPoint>;
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
  const scene = visual.scenes[activeSection] ?? visual.scenes[0] ?? [];

  return scene.map((point) => {
    const visualPoint = visual.points[point.id];

    if (!visualPoint) {
      throw new Error(`Visual point "${point.id}" is not defined.`);
    }

    return {
      id: point.id,
      x: point.x,
      y: point.y,
      shape: visualPoint.shape,
      className: visualPoint.className,
      ...(point.label && {
        label: {
          text: visualPoint.label ?? point.id,
          x: point.label.x,
          y: point.label.y,
        },
      }),
    };
  });
}

const sixthNode: Point = {
  id: "six",
  x: 8,
  y: 12,
  label: { x: 8, y: 13.5 },
};

const scenes: SceneDefinition[] = [
  [
    { id: "one", x: 8, y: 3 },
    { id: "two", x: 8, y: 9 },
  ],
  [
    { id: "one", x: 8, y: 3, label: { x: 8, y: 1.5 } },
    { id: "two", x: 5, y: 9, label: { x: 3.5, y: 10.5 } },
    { id: "three", x: 11, y: 9, label: { x: 12.5, y: 10.5 } },
  ],
  [
    { id: "one", x: 8, y: 3, label: { x: 8, y: 1.5 } },
    { id: "four", x: 11, y: 5, label: { x: 12.5, y: 5 } },
    { id: "three", x: 10, y: 9, label: { x: 11.5, y: 10.5 } },
    { id: "two", x: 6, y: 9, label: { x: 4.5, y: 10.5 } },
    { id: "five", x: 5, y: 5, label: { x: 3.5, y: 5 } },
  ],
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

export const littleInternetVisualWithSixthNode: Visual = {
  ...littleInternetVisual,
  scenes: [...scenes.slice(0, -1), [...scenes.at(-1)!, sixthNode]],
};
