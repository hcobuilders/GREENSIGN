import type { Route } from "./+types/home";
import { redirect } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GREENSIGN" },
    { name: "description", content: "Construction intelligence workspace" },
  ];
}

export function loader() {
  return redirect("/app/dashboard");
}

export default function Home() {
  return null;
}
