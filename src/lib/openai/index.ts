import OpenAI from 'openai';
import { env } from '~/env';

/**
 * @returns
 */
export function connectApi() {
  return new OpenAI({
    apiKey: env.OPEN_AI_KEY,
  });
}
