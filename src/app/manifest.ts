import type { MetadataRoute } from "next";

// Lets Tora be installed to a phone's home screen (Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tora",
    short_name: "Tora",
    description: "Personal finance tracker",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#115C3B",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
