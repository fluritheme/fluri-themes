import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        home: "index.html",
        privacy: "privacy/index.html",
        founder: "founder/index.html",
        license: "commercial-license/index.html",
        dashboard: "dashboard/index.html",
      },
    },
  },
  server: { host: "127.0.0.1", port: 5200 },
});
