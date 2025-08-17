import { connectApi } from '~/lib/openai';
import { Message, PostCreateSchema } from './tg-channel.types';
import { hashText, mdToHtml, substitute } from '~/utils/string';
import { db } from '~/db';
import { guinnessTopicsTable } from '~/db/schema';
import { desc } from 'drizzle-orm';
import { connectTgApi } from '~/lib/tg-api';

export const MAX_TEMPLATES_COUNT = 5;

export const guinnessHeaderTexts = {
  [0]: {
    title:
      '🥳 Поехали! Стартуем новую рубрику — самые безумные рекорды Guinness!',
    subtitle: 'И первым будет: <b>{{title}}</b>',
  },
  [1]: {
    title: '🚀 Йо! Снова в эфире подборка самых диких рекордов Guinness!',
    subtitle: 'Сегодня в рубрике: <b>{{title}}</b>',
  },
  [2]: {
    title: '😜 Скучно не будет — у нас новый безумный рекорд Guinness!',
    subtitle: 'Сегодня в рубрике: <b>{{title}}</b>',
  },
  [3]: {
    title:
      '🏆 Сегодня в рубрике Guinness World Records — что-то совершенно необычное!',
    subtitle: 'Рассмотрим рекорд: <b>{{title}}</b>',
  },
  [4]: {
    title: '🤯 Ещё один сумасшедший рекорд Guinness подлетел в нашу коллекцию!',
    subtitle: 'Сегодня в рубрике: <b>{{title}}</b>',
  },
  [5]: {
    title: 'Хэй! 🙌 Добро пожаловать в рубрику безумные рекорды Guinness!',
    subtitle: 'Сегодня в рубрике: <b>{{title}}</b>',
  },
} as const;

export const guinnessFooterTexts = {
  [0]: {
    title: 'Если рубрика наберет миллион луцков то мы её продолжим',
    subtitle: '(шутка. она итак продолжится 😈)',
  },
  [1]: {
    title: 'А вы смогли бы побить такой рекорд?',
    subtitle: 'Надо быть еще тем задротом)',
  },
  [2]: {
    title: 'Кажется, границ для человеческой фантазии нет!',
    subtitle: '',
  },
  [3]: {
    title: 'Ещё один штрих в коллекцию мировых рекордов!',
    subtitle: '',
  },
  [4]: {
    title: 'Мир полон удивительных достижений, и это лишь одно из них.',
    subtitle: '',
  },
  [5]: {
    title: 'Пишите в комментах, какой рекорд впечатлил бы вас больше!',
    subtitle: '',
  },
} as const;

type TemplateKey = keyof typeof guinnessHeaderTexts;

async function createGuinnessPost() {
  const promptsIds = {
    prepare: 'pmpt_68a1c1dd89a08194b42be9fbd12eea7d048819d8e13503c5',
  };
  const openai = connectApi();

  // Получаем новое уникальное навание гиннес рекорда
  const prepareRes = await openai.responses.create({
    prompt: {
      id: promptsIds.prepare,
      version: '3',
    },
  });
  const raw = prepareRes.output[0] as Message;

  const newTitleRecord = raw.content[0].text;
  const hash = hashText(raw.content[0].text);
  // const text = 'Пример рекорда гинеса9';
  // const hash = hashText(text);

  const lastTopic = db
    .select({ templateKey: guinnessTopicsTable.templateKey })
    .from(guinnessTopicsTable)
    .orderBy(desc(guinnessTopicsTable.createdAt))
    .limit(1)
    .get();

  // Высчитываем номер шаблона для следующего поста
  let newTemplateKey = lastTopic ? lastTopic.templateKey : 0;
  if (lastTopic) {
    const tmpKey = lastTopic.templateKey + 1;
    if (lastTopic.templateKey > 0 && tmpKey <= 5) {
      newTemplateKey = tmpKey;
    } else {
      newTemplateKey = 1;
    }
  }

  const result = await db
    .insert(guinnessTopicsTable)
    .values({
      title: newTitleRecord,
      hash,
      templateKey: newTemplateKey,
    })
    .onConflictDoNothing();

  // создано ничего не было, значит такой гиннес рекорд уже был создан ранее и нужно получить новый
  if (!result.changes) {
    console.warn('[Guinness] Duplicate:', { text: newTitleRecord, hash });
    console.debug('Вызов рекурсии... ');
    return await createGuinnessPost();
  }

  console.debug('[Guinness] New record:', { text: newTitleRecord, hash });

  const prompts = [
    `Detail Guinness record: "${newTitleRecord}". Start catchy (1–2 lines). Describe what, who, when/where. Add 1–2 facts. Max 4 paras, light style, emojis ok. In Russian.`,
    `Short story for TG about Guinness record: "${newTitleRecord}". Start with "Did you know…" (1 para. In russian). Say who+when+how. End with joke/note, emojis ok. 2–3 paras. In Russian.`,
    `TG fact-post about Guinness record: "${newTitleRecord}". 1st line: title+emoji. 2nd: 1 sentence what/who/where. 3rd: fact or number. Max 5 lines. In Russian.`,
  ];

  // случайный выбор промпта из заданных шаблонов
  const idx = Math.floor(Math.random() * prompts.length);
  const prompt = prompts[idx];
  console.debug('[choosen prompt index]', idx);

  const createPostRes = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
    temperature: 0.4,
  });

  const rawNewPost = createPostRes.output[0] as Message;
  const newPostText = rawNewPost.content[0].text;
  console.debug('newPostText', newPostText);

  // Формируем шаблон для нового поста
  const template = `
  🚀 <b>${guinnessHeaderTexts[newTemplateKey as TemplateKey].title}</b>

  ${substitute(guinnessHeaderTexts[newTemplateKey as TemplateKey].subtitle, {
    title: newTitleRecord,
  })}

  ${newPostText}
  `;

  const tg = await connectTgApi();
  // test_marunova
  await tg.sendMessage('test_marunova', {
    message: mdToHtml(template),
    parseMode: 'html',
  });

  return template;
}

export async function createPost(body: PostCreateSchema) {
  try {
    if (body.topic === 'guinness') {
      return await createGuinnessPost();
    }
    return;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
