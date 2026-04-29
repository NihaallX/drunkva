// PWA Web App Manifest
export default function manifest() {
  return {
    name: "Drunkva",
    short_name: "Drunkva",
    description: "Track every session. Log drinks, follow friends, share your peak.",
    start_url: "/session",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111111",
    theme_color: "#E8621A",
    categories: ["lifestyle", "social"],
    icons: [
      {
        src: "/icons/drunkva-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/drunkva-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
