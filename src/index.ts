import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { env } from './env';
import { tgChannel } from '~/routes/tg-channel/tg-channel.routes';

const app = new Hono();

app.route('/api', tgChannel);

serve({
  fetch: app.fetch,
  port: env.TG_CHANNEL_PORT,
});

console.log(`🚀 Server running at http://localhost:${env.TG_CHANNEL_PORT}`);
