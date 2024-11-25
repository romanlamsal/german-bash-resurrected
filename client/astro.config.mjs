// @ts-check
import { defineConfig } from "astro/config"

import tailwind from "@astrojs/tailwind"

// https://astro.build/config
export default defineConfig({
    site: 'https://romanlamsal.github.io',
    base: 'german-bash-resurrected',

    redirects: {
        "/": "german-bash-resurrected/page/1",
    },

    integrations: [tailwind()],
})
