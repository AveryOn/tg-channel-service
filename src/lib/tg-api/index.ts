import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { env } from '~/env';

const TG_API_ID = Number(env.TG_API_ID ?? 0);
const TG_API_KEY = env.TG_API_KEY;
const TG_SESSION_ID = env.TG_SESSION_ID;

export async function connectTgApi() {
  const session = new StringSession(TG_SESSION_ID);
  const client = new TelegramClient(session, TG_API_ID, TG_API_KEY, {
    connectionRetries: 5,
  });
  await client.connect();

  return client;
}
