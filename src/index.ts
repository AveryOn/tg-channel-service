import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { env } from './env';
import { tgChannel } from '~/routes/tg-channel/tg-channel.routes';

const app = new Hono();

app.route('/api', tgChannel);

// app.get('/users', (c) => c.json(users));

// app.put('/users/:id', async (c) => {
//   const id = Number(c.req.param('id'));
//   const body = await c.req.json();
//   const parsed = schema.safeParse(body);
//   if (!parsed.success) return c.json(parsed.error, 400);
//   if (!users[id]) return c.json({ error: 'Not found' }, 404);
//   users[id] = parsed.data;
//   return c.json(parsed.data);
// });

// app.delete('/users/:id', (c) => {
//   const id = Number(c.req.param('id'));
//   if (!users[id]) return c.json({ error: 'Not found' }, 404);
//   const removed = users.splice(id, 1);
//   return c.json(removed[0]);
// });

serve({
  fetch: app.fetch,
  port: env.TG_CHANNEL_PORT,
});

console.log(`🚀 Server running at http://localhost:${env.TG_CHANNEL_PORT}`);
