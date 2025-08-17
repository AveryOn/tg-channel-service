import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { env } from './env';
import OpenAI from 'openai';

const TG_API_ID = Number(env.TG_API_ID ?? 0);
const TG_API_KEY = env.TG_API_KEY;
const TG_SESSION_ID = env.TG_SESSION_ID;
const OPEN_AI_KEY = env.OPEN_AI_KEY;

(async () => {
  const session = new StringSession(TG_SESSION_ID);
  const client = new TelegramClient(session, TG_API_ID, TG_API_KEY, {
    connectionRetries: 5,
  });
  await client.connect();

  const openai = new OpenAI({
    apiKey: OPEN_AI_KEY,
  });

  const response = await openai.responses.create({
    prompt: {
      id: 'pmpt_68a1918be6488194928615ef2ca3d1e207d8f78e951fe5b3',
      version: '2',
    },
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  console.log(response.output[0].content[0].text);
})();
