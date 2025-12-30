import z from 'zod';

export const TOPICS = ['guinness'] as const;

export const postCreateSchema = z.object({
  rawDeliveryAt: z.string(),
  task: z.string(),
});

export type PostCreateSchema = z.infer<typeof postCreateSchema>;

export const messageCreateSchema = z.object({
  userId: z.string().or(z.number()),
  text: z.string(),
});

export type MessageCreateSchema = z.infer<typeof messageCreateSchema>;

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

export interface SendMessageParams {
  userId: string | number;
  message: string;
}

export enum TaskStatus {
  active = 'active',
  paused = 'paused',
  done = 'done',
  error = 'error',
}
