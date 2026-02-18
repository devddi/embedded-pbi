import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const pwaIconSrc =
  process.env.VITE_PWA_ICON_URL ||
  "https://xatiqvtpqoipofqretoe.supabase.co/storage/v1/object/public/Gerais/logo_ddi.png";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "robots.txt", "icons/app-icon.png"],
      manifest: {
        name: "Hub - DDInsights",
        short_name: "Hub DDInsights",
        start_url: "/",
        display: "standalone",
        background_color: "#0a465f",
        theme_color: "#189AB4",
        orientation: "portrait",
        icons: [
          {
            src: pwaIconSrc,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
