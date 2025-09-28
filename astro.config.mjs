import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://contrerasfrancisco.com',
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
});
