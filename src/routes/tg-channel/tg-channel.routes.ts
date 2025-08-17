import { Hono } from 'hono';
import { postCreateSchema } from './tg-channel.types';
import { createPost } from './tg-channel.handler';
import { mdToHtml } from '~/utils/string';

export const tgChannel = new Hono();

/**
 * Создать новый пост
 */
tgChannel.post('/post', async (c) => {
  const body = await c.req.json();
  const { data, success, error } = postCreateSchema.safeParse(body);
  if (!success) return c.json(error, 400);

  const template = await createPost(data);

  return c.json({ success: 'ok', data: template }, 201);
});

tgChannel.get('/post', async (c) => {
  const ex = [
    '**Жирный текст**',
    '*Курсивный текст*',
    "`console.log('hello')`",
    'Смешанный: **жирный и *внутри курсив***',
    'Многострочный:\n**строка 1**\n*строка 2*\n`код`',
    'Без форматирования вообще',
    '**Комбо**: начало *курсив*, потом `код` и снова **жирный**',
  ];
  for (const str of ex) {
    const res = mdToHtml(str);
    console.debug({
      before: str,
      after: res,
    });
  }

  return c.json({ success: true, data: 'ok' }, 200);
});
