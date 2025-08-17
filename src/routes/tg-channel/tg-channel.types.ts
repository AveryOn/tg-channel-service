import z from 'zod';

export const TOPICS = ['guinness'] as const;

export const postCreateSchema = z.object({
  topic: z.enum(TOPICS),
});

export type PostCreateSchema = z.infer<typeof postCreateSchema>;

export interface OpenAiMessage {
  id: string;
  type: 'message';
  status: 'completed' | 'pending' | 'failed';
  content: {
    type: 'output_text';
    annotations: unknown[];
    logprobs: unknown[];
    text: string;
  }[];
  role: 'assistant' | 'user' | 'system';
}
