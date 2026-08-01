import type { Config } from "@react-router/dev/config";

export default {
  basename: "/p/",
  ssr: true,
  future: {
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
