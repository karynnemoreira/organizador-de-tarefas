// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
const configureProject = defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.js (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server.js" },
    start: { entry: "start.js" },
    router: {
      entry: "router.jsx",
      disableTypes: true,
      generatedRouteTree: "routeTree.gen.js",
    },
  },
});

export default async function configureJavaScriptProject(environment) {
  const config = await configureProject(environment);
  // The shared preset adds a plugin tied to tsconfig.json. JavaScript uses
  // jsconfig.json for editor hints and the preset's existing @ alias at runtime.
  config.plugins = config.plugins.filter((plugin) => plugin?.name !== "vite-tsconfig-paths");
  return config;
}
