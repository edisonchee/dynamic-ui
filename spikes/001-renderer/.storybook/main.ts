import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  // Storybook builds with Vite and renders React. It reuses vite.config.ts,
  // so the React plugin is set up in one place.
  framework: "@storybook/react-vite",

  // Every *.stories.tsx file under src/ becomes a sidebar entry.
  stories: ["../src/**/*.stories.@(ts|tsx)"],

  core: {
    // Storybook sends anonymous usage data by default. Off: this repo is meant
    // for a regulated org, and the spike gains nothing from it.
    disableTelemetry: true,

    // `pnpm storybook` listens on 0.0.0.0 (every network interface) so a
    // browser outside the VM can reach it. Storybook then rejects requests
    // whose Host header is an unknown hostname (a DNS-rebinding defence), but
    // only when this list is non-empty. IP addresses and `localhost` are
    // always allowed, so listing "localhost" just switches the check on.
    // Reach the VM by a hostname (e.g. debian-vm.local)? Add it with
    // ALLOWED_HOSTS=debian-vm.local (comma-separated for several).
    allowedHosts: ["localhost", ...(process.env.ALLOWED_HOSTS?.split(",") ?? [])],
  },

  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      server: {
        watch: {
          // File watching normally relies on OS file-change events (inotify on
          // Linux). Those events do NOT arrive for files on a VirtualBox shared
          // folder edited from Windows. WATCH_POLLING=1 makes the watcher check
          // files on a timer instead: slower, but it works everywhere.
          usePolling: process.env.WATCH_POLLING === "1",
          interval: 300,
        },
      },
    });
  },
};

export default config;
