const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const OFFSET_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const pad = (value: number): string => String(value).padStart(2, "0");

const formatLocalDateTime = (date: Date): string =>
  [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join("T");

const formatOffset = (date: Date): string => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(absoluteMinutes / 60))}:${pad(absoluteMinutes % 60)}`;
};

const parseLocalDateTime = (value: string): Date | null => {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

export const currentTimestamp = (): string => formatTimestampWithOffset(new Date());

export const formatTimestampWithOffset = (date: Date): string =>
  `${formatLocalDateTime(date)}${formatOffset(date)}`;

export const toDateTimeInputValue = (value: string | undefined): string => {
  if (!value) return "";

  if (OFFSET_DATE_TIME_PATTERN.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : formatLocalDateTime(date);
  }

  if (DATE_ONLY_PATTERN.test(value)) return `${value}T00:00:00`;

  const localDate = parseLocalDateTime(value);
  return localDate ? formatLocalDateTime(localDate) : "";
};

export const fromDateTimeInputValue = (value: string): string => {
  const date = parseLocalDateTime(value);
  return date ? formatTimestampWithOffset(date) : value;
};

export const isIso8601DateTimeWithOffset = (value: string): boolean => {
  if (!OFFSET_DATE_TIME_PATTERN.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
};

export const isIso8601Date = (value: string): boolean =>
  DATE_ONLY_PATTERN.test(value) || isIso8601DateTimeWithOffset(value);
