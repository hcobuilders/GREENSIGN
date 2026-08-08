import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("app/*", "routes/application.tsx"),
  route("gm_RH/*", "routes/godmode.tsx"),
  route("mockup/*", "routes/mockup.tsx"),
] satisfies RouteConfig;
