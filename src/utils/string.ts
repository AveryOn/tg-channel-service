import { createHash } from 'node:crypto';

/**
 * Создаёт детерминированный хэш для переданной строки.
 *
 * @param {string} text - Входной текст, который нужно закодировать.
 * @param {string} [algorithm="sha256"] - Алгоритм хэширования (например: "sha256", "md5", "sha512").
 * @returns {string} Хэш в шестнадцатеричном формате (hex).
 * @throws {TypeError} Если входной текст не является строкой.
 * @throws {Error} Если выбранный алгоритм не поддерживается.
 * @example
 * const hash = hashText("hello"); // sha256 по умолчанию
 * const md5 = hashText("hello", "md5");
 */
export function hashText(text: string, algorithm: string = 'sha256'): string {
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string');
  }
  try {
    return createHash(algorithm).update(text).digest('hex');
  } catch (err) {
    console.error(`Hashing failed`, err);
    throw err;
  }
}

/**
 * Подставляет значения из объекта в шаблон с плейсхолдерами {{key}}.
 * @param template - строка с плейсхолдерами
 * @param vars - объект с переменными
 * @returns строка с заменёнными значениями
 * @throws {Error} Если найден плейсхолдер без значения в vars.
 * @example
 * substitute('И первым будет: {{title}}', { title: 'Example text' });
 * // "И первым будет: Example text"
 */
export function substitute(
  template: string,
  vars?: Record<string, string>,
): string {
  if (typeof template !== 'string') {
    throw new TypeError('Template must be a string');
  }
  if (!vars) return template;

  return template.replace(/{{(.*?)}}/g, (_, rawKey) => {
    const key = rawKey.trim();

    if (!(key in vars)) {
      throw new Error(`Missing value for placeholder: ${key}`);
    }

    const value = vars[key];
    if (typeof value !== 'string') {
      throw new TypeError(`Value for "${key}" must be a string`);
    }

    return value;
  });
}

/**
 * Преобразует упрощённый Markdown-текст в HTML для Telegram (жирный, курсив, код, переносы строк).
 * Поддержка:
 * - **жирный** -> <b>…</b>
 * - *курсив* -> <i>…</i>
 * - `код` -> <code>…</code>
 * - \n -> <br>
 * @param {string} text Входной текст в Markdown-подобном формате.
 * @returns {string} Строка в HTML-формате.
 */
export function mdToHtml(text: string): string {
  try {
    if (typeof text !== 'string') {
      throw new TypeError('Input must be a string');
    }
    let html = text;
    // жирный **текст**
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    // курсив *текст*
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
    // моноширинный `код`
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    return html;
  } catch (err) {
    console.error('Markdown to HTML conversion error:', err);
    return text;
  }
}
