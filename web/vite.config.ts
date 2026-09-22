import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";
import { bootScript } from "./src/lib/theme-config";

const api = process.env.HUB_URL ?? "http://localhost:4400";
const base = process.env.BASE_PATH?.trim() || "/";
const PROXIED_PREFIXES = ["/api", "/index", "/pkg"];
const DEV_PORT = 5173;

function themeBoot(): Plugin {
  return {
    name: "petahub-theme-boot",
    transformIndexHtml() {
      return [{ tag: "script", injectTo: "head-prepend", children: bootScript() }];
    }
  };
}

export default defineConfig({
  base,
  plugins: [react(), themeBoot()],
  server: {
    port: DEV_PORT,
    proxy: Object.fromEntries(
      PROXIED_PREFIXES.map((prefix) => [prefix, { target: api, changeOrigin: false }])
    )
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"]
  }
});
