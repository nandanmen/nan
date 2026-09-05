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

export type Scene = {
  title: string;
  points: readonly ScenePoint[];
  packet?: {
    x: number;
    y: number;
    rotate: number;
  };
};

/** Scenes are ordered by the active section that drives the figure. */
export const scenes: readonly Scene[] = [
  {
    title: "Two connected computers",
    points: [
      { id: "one", x: 8, y: 3, shape: "circle", className: "fill-blue-7" },
      { id: "two", x: 8, y: 9, shape: "square", className: "fill-yellow-10" },
    ],
  },
  {
    title: "Three connected computers",
    points: [
      {
        id: "one",
        x: 8,
        y: 3,
        shape: "circle",
        className: "fill-blue-7",
        label: { text: "1", x: 8, y: 1.5 },
      },
      {
        id: "two",
        x: 5,
        y: 9,
        shape: "square",
        className: "fill-yellow-10",
        label: { text: "2", x: 3.5, y: 10.5 },
      },
      {
        id: "three",
        x: 11,
        y: 9,
        shape: "triangle",
        className: "fill-red-8",
        label: { text: "3", x: 12.5, y: 10.5 },
      },
    ],
    packet: { x: 6.5, y: 6, rotate: 30 },
  },
  {
    title: "Five fully connected computers",
    points: [
      {
        id: "one",
        x: 8,
        y: 3,
        shape: "circle",
        className: "fill-blue-7",
        label: { text: "1", x: 8, y: 1.5 },
      },
      {
        id: "four",
        x: 11,
        y: 5,
        shape: "circle",
        className: "fill-cyan-9",
        label: { text: "4", x: 12.5, y: 5 },
      },
      {
        id: "three",
        x: 10,
        y: 9,
        shape: "triangle",
        className: "fill-red-9",
        label: { text: "3", x: 11.5, y: 10.5 },
      },
      {
        id: "two",
        x: 6,
        y: 9,
        shape: "square",
        className: "fill-yellow-10",
        label: { text: "2", x: 4.5, y: 10.5 },
      },
      {
        id: "five",
        x: 5,
        y: 5,
        shape: "diamond",
        className: "fill-green-9",
        label: { text: "5", x: 3.5, y: 5 },
      },
    ],
    packet: { x: 6.5, y: 4, rotate: -36 },
  },
];
