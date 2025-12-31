import { connectApi } from '~/lib/openai';
import { PostCreateSchema, SendMessageParams } from './tg-channel.types';
import moment from 'moment';
import { tasksTable, TaskStatus, TaskType, tgUsersTable } from '~/db/schema';
import { db } from '~/db';
import { buildDayTasksMap, DayTasksMap, ReminderParseResult, Task, TasksMap } from '~/db/tasks-map';
import { TelegramClient } from 'telegram';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { and, eq, isNull } from 'drizzle-orm';
import { compareDates, getTimeByTemplate, getTZ, parseTimeToMs, today } from '~/utils/datetime';
import z from 'zod';
import { StringSession } from 'telegram/sessions';
import { env } from '~/env';

export enum UserCurrentStep {
  start = 'start',
  add_reminder = 'add_reminder',
  wait_input_reminder_summary = 'wait_input_reminder_summary',
  wait_input_reminder_date = 'wait_input_reminder_date',
  reminder_success_created = 'reminder_success_created',
  seeing_today_reminder_list = 'seeing_today_reminder_list',
}
const userCallContext: Record<string, UserCurrentStep | string> = {};

const TG_API_ID = env.TG_API_ID;
const TG_API_KEY = env.TG_API_KEY;
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
let intervalId: NodeJS.Timeout | null = null
let dayTasksMap: DayTasksMap = {}

export const bot = new TelegramClient(
  new StringSession(''),
  TG_API_ID,
  TG_API_KEY,
  { connectionRetries: 5 },
);

/** Запуск ТГ-бота */
export async function botStart() {
  await bot.start({
    botAuthToken: TG_BOT_TOKEN!,
  });
  console.debug('[INFO] TG_BOT has been started!')
}

/**
 * Запуск каледнаря напоминаний
 */
export async function scheduleStart() {
  try {
    // -----------------------TG_BOT-------------------------
    bot.addEventHandler(
      async (event) => handlerBotCommands(bot, event),
      new NewMessage({ incoming: true }),
    );
    // -----------------------TG_BOT-------------------------
    if(intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    intervalId = setInterval(async () => {
      const tasks: Task[] = (await db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.status, TaskStatus.active),
            isNull(tasksTable.lastRunAt),
          )
        )
      ) as unknown as Task[];

      tasks.map((task) => {
        if (typeof task.parsedJson === 'string') {
          task.parsedJson = JSON.parse(task.parsedJson);
        }
        return task;
      });

      // TODO в будущем внедрить batch size оптимизацию
      dayTasksMap = buildDayTasksMap(tasks, 30);


      const todayKey = today();

      const todayTasks = dayTasksMap[todayKey] ?? [];
      console.debug('[SCHEDULE_JOB]', {
        tasks: todayTasks.length,
        today: todayKey,
      })
      await findAndCallReadyTasks(todayTasks);
    }, 60 * 1000);

    console.debug('[INFO] Schedule has been started!')
  } catch (err) {
    console.error('[ERROR] Ошибка при запуске Scheduler')
  }

}

export async function handlerRawDataByAI(data: PostCreateSchema) {
  const openai = connectApi();

  const now = moment().format('DD.MM.YYYYTHH:mm:ss');
  const input = `${data.rawDeliveryAt};сегодня: ${now}`;
  console.debug({input});

  // Получаем новое уникальное навание гиннес рекорда
  const prepareRes = await openai.responses.create({
    prompt: {
      id: 'pmpt_68b19a283b088190a6db53880c15023b00f114902b3c1450',
      version: '7',
      variables: {
        input_text: input,
      },
    },
  });
  const raw = JSON.parse(prepareRes?.output_text) as ReminderParseResult;

  // Если время не указано, то по умолчанию берем 9 утра
  if (!raw.time) {
    raw.time = '09:00:00';
  }
  return raw;
}

export async function sendMessage(
  bot: TelegramClient,
  params: SendMessageParams,
) {

  await bot.sendMessage(params.userId, {
    message: params.message,
  });
}

export async function handlerBotCommands(
  bot: TelegramClient,
  event: NewMessageEvent,
) {
  const msg = event.message;
  if (!msg || !msg.text) return;

  const text = msg.text.trim();
  const senderId = msg.senderId!.valueOf();

  const [user] = await db
    .select({
      id: tgUsersTable.id,
      createdAt: tgUsersTable.createdAt,
      updatedAt: tgUsersTable.updatedAt,
    })
    .from(tgUsersTable)
    .where(eq(tgUsersTable.id, senderId));

  if (!user) {
    await db.insert(tgUsersTable).values({
      id: senderId,
    });
  }

  console.debug({ userCallContext });

  // COMMAND: /start
  if (text.startsWith('/start')) {
    userCallContext[senderId] = UserCurrentStep.start;

    await bot.sendMessage(senderId, {
      message:
        'Здарова! Если хочешь создать новое напоминание вводи команду /add_reminder',
    });

    return;
  }

  // COMMAND: /add_reminder
  if (text.startsWith('/add_reminder')) {
    userCallContext[senderId] = UserCurrentStep.add_reminder;

    await bot.sendMessage(senderId, {
      message: 'Напиши текст напоминания. Что угодно!',
    });
    userCallContext[senderId] = UserCurrentStep.wait_input_reminder_summary;

    return;
  }

  // Если пользователь отправил описания для напоминания
  if (
    userCallContext[senderId] === UserCurrentStep.wait_input_reminder_summary
  ) {
    console.debug('пользователь написал напоминание!', text);

    // создаем задачу напоминание
    const [newReminder] = await db
      .insert(tasksTable)
      .values({
        status: TaskStatus.paused,
        type: TaskType.reminder,
        rawText: text,
        timezone: getTZ(),
        tgUserId: senderId,
      })
      .returning();

    await bot.sendMessage(senderId, {
      message:
        'Супер! Записал твое напоминание. Укажи время, когда я должен присылать это напоминание:',
    });
    userCallContext[senderId] =
      `${newReminder.id}/${UserCurrentStep.wait_input_reminder_date}`;

    return;
  }

  // Если пользователь отправил дату для триггера напоминания
  if (
    userCallContext[senderId]?.includes(UserCurrentStep.wait_input_reminder_date)
  ) {
    console.debug(`SENDER-[${senderId}]:`, 'Пользователь ввел дату напоминания:', text);

    // вытаскиваем из стейта айдишник напоминания который запоминили на предыдущем шаге
    const [reminderId, __] = userCallContext[senderId].split('/');

    // Валидируем что это действительно айдишник
    const { success } = z.string().uuid().safeParse(reminderId)

    // в случае если reminderId не валидный, бот отправляет сообщние юзеру и выходим
    if(!success) {
      console.warn(`SENDER-[${senderId}]: reminderId не валиден. Строка из userCallContext:`, { [senderId]: userCallContext[senderId] })
      await bot.sendMessage(senderId, {
        message: `Что-то пошло не так! Создать напоминание не удалить, обратитесь в поддержку с таким ID - \`${senderId}\``,
      });
      return;
    }

    // Находим по ID напоминание
    const [reminder] = await db
      .select({
        id: tasksTable.id,
        rawText: tasksTable.rawText,
      })
      .from(tasksTable)
      .where(eq(tasksTable.id, reminderId))

    // если напоминания по такому ID не найдено
    if(!reminder) {
      console.warn(`SENDER-[${senderId}]: напоминание с ID ${reminderId} не найдено в Базе Данных`)
      await bot.sendMessage(senderId, {
        message: `Что-то пошло не так! Создать напоминание не удалить, обратитесь в поддержку с таким ID - \`${senderId}\``,
      });
      return;
    }

    // отправляем запрос на обработку сырого текста в AI агента
    const parsedJSON = await handlerRawDataByAI({
      rawDeliveryAt: text,
      task: reminder.rawText
    })

    // TODO внедрить zod валидацию
    // Если объект с расписанием не валидный
    if(!parsedJSON) {
      console.warn(`SENDER-[${senderId}]: ошибка в получении ответа от AI`, { parsedJSON })
      await bot.sendMessage(senderId, {
        message: `Что-то пошло не так! Создать напоминание не удалить, обратитесь в поддержку с таким ID - \`${senderId}\``,
      });
      return;
    }

    // Обновляем напоминание -> делаем его активным
    const [updatedReminder] = await db
      .update(tasksTable)
      .set({
        parsedJson: JSON.stringify(parsedJSON),
        status: TaskStatus.active,
        updatedAt: Date.now(),
        rawDeliveryAt: text,
      })
      .where(eq(tasksTable.id, reminder.id))
      .returning()

    // Добавляем новое напоминание в общую карту
    buildDayTasksMap([updatedReminder as Task], 30)

    console.debug('Карта напоминаний обновлена!', { TasksMap, senderId: `${senderId}` })

    await bot.sendMessage(senderId, {
      message: 'Отлично! Напоминание успешно создано!',
    });
    userCallContext[senderId] = UserCurrentStep.reminder_success_created;

    return;
  }

  // Если пользователь запросил список напоминаний на сегодня
  if(text.startsWith('/today_reminder_list')) {
    userCallContext[senderId] = UserCurrentStep.seeing_today_reminder_list

    const list = dayTasksMap[today()]
      .filter(t => t.tgUserId !== senderId)
      .map((t, idx) => `[${idx + 1}] ${t.rawText}`)
      .join('\n')

    await bot.sendMessage(senderId, {
      message: 'Список напоминаний на сегодня:\n\n' + list
    });
    return;
  }
}

/** Находит задачи которые готовы к вызову */
function findReadyTasks(tasks: Task[]): Task[] {
  console.debug('[CALL][findReadyTasks]')
  const currentTime = getTimeByTemplate();
  const currentDate = today();
  const tz = getTZ();

  const currentMs = parseTimeToMs(
    `${currentDate}T${currentTime}`,
    'DD.MM.YYYYTHH:mm:ss',
    tz,
  );

  return tasks.filter((task) => {
    if (!task.parsedJson) {
      return false;
    }

    const time = task.parsedJson.time;
    const date = task.parsedJson.next_date;
    const taskSheduleMs = parseTimeToMs(
      `${date}T${time}`,
      'DD.MM.YYYYTHH:mm:ss',
      tz,
    );

    const diff = compareDates(currentMs, taskSheduleMs);

    // Если пришло время вызывать задачу
    if (diff === 1 || diff === 0) {
      return true;
    }
    // Если время вызывать задачу еще не наступило
    else {
      return false;
    }
  });
}

/** Вызвать готовые задачи (задачи, срок которых уже подошел) */
async function callReadyTasks(tasks: Task[]) {
  console.debug('[CALL][callReadyTasks]', { 'tasks.length': tasks.length })

  for (let i = 0; i < tasks.length; i++) {

    const task = tasks[i];
    console.debug('READY TASK:', { task });

    if(task.tgUserId) {
      await sendMessage(bot, {
        message: task.rawText,
        userId: task.tgUserId,
      });

      // После успешного вызова напоминания, помечаем его в БД как выполненную
      await db
        .update(tasksTable)
        .set({
          status: TaskStatus.done,
          updatedAt: Date.now(),
          lastRunAt: Date.now(),
        })
        .where(eq(tasksTable.id, task.id))

      // Также удаляем это напоминание с карты
      // const todayKey = today();
      // TasksMap[todayKey] = TasksMap[todayKey]?.filter((t) => t.id !== task.id)
    }
  }
}

async function findAndCallReadyTasks(tasks: Task[]) {
  const readyTask = findReadyTasks(tasks);
  await callReadyTasks(readyTask);
}
