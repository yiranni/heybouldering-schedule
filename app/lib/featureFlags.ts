export const FEATURE_FLAG_ALLOW_DELAY_CREATE_CLASS = 'ALLOW_DELAY_CREATE_CLASS';

export const LESSON_CREATE_WINDOW_MS = 48 * 60 * 60 * 1000;

export const LESSON_CREATE_DATE_RESTRICTED_ERROR = '只能补录最近48小时内的课程';

export function toDateTimeLocalInput(value?: string | Date): string {
  const d = value ? (value instanceof Date ? value : new Date(value)) : new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function isLessonCreateDateAllowed(
  lessonDate: Date,
  allowDelayCreate: boolean,
  now: Date = new Date()
): boolean {
  if (allowDelayCreate) return true;
  const lessonTime = lessonDate.getTime();
  const nowTime = now.getTime();
  return lessonTime >= nowTime - LESSON_CREATE_WINDOW_MS && lessonTime <= nowTime;
}

export function getLessonCreateDateTimeLocalBounds(
  allowDelayCreate: boolean,
  now: Date = new Date()
): { min?: string; max?: string } {
  if (allowDelayCreate) return {};
  return {
    min: toDateTimeLocalInput(new Date(now.getTime() - LESSON_CREATE_WINDOW_MS)),
    max: toDateTimeLocalInput(now),
  };
}
