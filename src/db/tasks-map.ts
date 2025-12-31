import moment from 'moment';
import { TaskStatus } from './schema';

export interface ReminderParseResult {
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number | null;
  weekdays: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[] | null;
  time: string; // HH:mm:ss
  timezone: string; // e.g. "UTC+4"
  next_date: string; // DD.MM.YYYY
}

export type Task = {
  id: string;
  rawText: string;
  rawDeliveryAt: string | null;
  nextRunAt: number | null;
  status: TaskStatus | string;
  lastRunAt: number | null;
  tgUserId: number | null;
  parsedJson: ReminderParseResult | null;
};

export type DayKey = `${string}`; // "DD.MM.YYYY"

export type DayTasksMap = Record<DayKey, Task[]>;

export const TasksMap: DayTasksMap = {};

// -------------------------------------------------
//                                                 |
// -------------------------------------------------

const weekdayMap: Record<
  'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat',
  number
> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function addTaskForMoment(
  map: DayTasksMap,
  task: Task,
  m: moment.Moment,
) {
  const key = m.format('DD.MM.YYYY') as DayKey;
  if (!map[key]) {
    map[key] = [];
  }
  map[key].push(task);
}

export function buildDayTasksMap(tasks: Task[], horizonDays = 30): DayTasksMap {
  const map: DayTasksMap = {};
  const now = moment();

  for (const task of tasks) {
    if (task.status !== 'active') continue;
    if (!task.parsedJson) continue;

    const { repeat, interval, weekdays, next_date } = task.parsedJson;
    let time = task.parsedJson.time;

    // Если время не указано, то по умолчанию берем 9 утра
    if (!time) {
      time = '09:00:00';
    }

    const [hh, mm, ss] = time.split(':').map(Number);

    // one-time
    if (repeat === 'none' && next_date) {
      const m = moment(next_date, 'DD.MM.YYYY').hour(hh).minute(mm).second(ss);
      addTaskForMoment(map, task, m);
      continue;
    }

    // daily
    if (repeat === 'daily' && interval) {
      for (let i = 0; i <= horizonDays; i += interval) {
        const m = now.clone().add(i, 'days').hour(hh).minute(mm).second(ss);
        addTaskForMoment(map, task, m);
      }
      continue;
    }

    // weekly + weekdays
    if (repeat === 'weekly' && interval && weekdays) {
      for (const wd of weekdays) {
        const targetDay = weekdayMap[wd];

        const base = now.clone();
        while (base.day() !== targetDay) {
          base.add(1, 'day');
        }

        for (let i = 0; i <= horizonDays; i += interval * 7) {
          const m = base.clone().add(i, 'days').hour(hh).minute(mm).second(ss);
          addTaskForMoment(map, task, m);
        }
      }
      continue;
    }
  }

  return map;
}


