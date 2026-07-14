import type { MetadataRoute } from "next";

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
        src: "/O%20(8).png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
