import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("p/internet", "routes/internet/index.tsx"),
  route("p/gpu-rasterization", "routes/gpu-rasterization/index.tsx"),
  route("n", "routes/notes-layout.tsx", [
    index("routes/notes-index.tsx"),
    route(":note", "routes/note.tsx"),
  ]),
] satisfies RouteConfig;
