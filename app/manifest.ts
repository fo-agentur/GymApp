import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MacroFactor Workouts",
    short_name: "Workouts",
    description: "Science-based training that adapts. Your coach in your pocket.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080f",
    theme_color: "#08080f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
