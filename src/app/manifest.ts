import type { MetadataRoute } from "next";

const CANONICAL_ICON_PATH = "/brand/moral-trade-mark.png?v=20260730";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Moral Trade",
    short_name: "Moral Trade",
    description:
      "A public-interest web app for structured moral commitments, grounded in careful reasoning, explicit terms, and transparent limitations.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: CANONICAL_ICON_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
