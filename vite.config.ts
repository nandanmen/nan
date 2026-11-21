import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { mdxEditServer, rehypeSourceRanges } from "./vite/mdx-edit";

export default defineConfig(({ command }) => ({
  build: {
    assetsDir: "p/assets",
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    mdx({
      // In dev, tag prose blocks with their source ranges so they can be edited in the browser.
      rehypePlugins:
        command === "serve" ? [[rehypeSourceRanges, { root: import.meta.dirname }]] : [],
    }),
    mdxEditServer(),
    reactRouter(),
    tsconfigPaths(),
  ],
}));
