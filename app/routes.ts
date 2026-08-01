import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("internet", "routes/internet/index.tsx"),
] satisfies RouteConfig;
