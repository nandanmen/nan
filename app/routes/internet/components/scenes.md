# Scenes

```tsx
type Visual = {
  points: Record<string, ScenePoint>;
  scenes: SceneDefinition[];
}

type ScenePoint = {
  shape: "circle" | "square" | "triangle" | "diamond";
  className: string;
  label?: string;
}

type SceneDefinition = Point[];

type Point = {
  id: string;
  x: number;
  y: number;
  label?: { x: number; y: number };
}

function useVisual(visual: Visual): Scene;

type Scene = ScenePoint[];

type ScenePoint = {
  id: string;
  x: number;
  y: number;
  shape: "circle" | "square" | "triangle" | "diamond";
  className: string;
  label?: {
    text: string;
    x: number;
    y: number;
  }
}
```

Usage:

```tsx
const scene = useVisual(littleInternetVisual);
```
