import moment from 'moment';

/** @returns 'DD.MM.YYYY' */
export const today = () => moment().format('DD.MM.YYYY');

/** @returns '09:00:00' */
export function getTimeByTemplate() {
  return moment().format('HH:mm:ss');
}

/**
 * вход -> '12:30:12'
 * @returns ''
 */
export function parseTimeToMs(
  timeStr: string,
  template = 'HH:mm:ss',
  timezone = 'UTC+4',
) {
  const offsetHours = Number(timezone.replace('UTC', ''));
  const m = moment(timeStr, template).utc().add(offsetHours, 'hours');

  return m.valueOf();
}

/**
 * @returns 'UTC+4'
 */
export function getTZ() {
  const offsetHours = moment().utcOffset() / 60;
  return `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
}

/**
 * Сравнить 2 даты в миллисекундах
 * @returns
 * * 1 - значит что текущая дата опередила вторую
 * * -1 - значит что текущая дата еще не дошла до второй
 * * 0 - даты сравнялись на данный момент
 * */
export function compareDates(
  currentDate: number,
  secondDate: number,
): 1 | 0 | -1 {
  if (!currentDate || !secondDate) {
    console.warn('оба аргмуента обязательны');
    return 0;
  }

  const diff = currentDate - secondDate;
  if (diff > 0) return 1;
  else if (diff < 0) return -1;
  return 0;
}
