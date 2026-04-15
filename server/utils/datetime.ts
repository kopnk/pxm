import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TZ = "Asia/Jakarta";
const DEFAULT_FORMAT = "YYYY-MM-DD HH:mm:ss";

export function toLocalTime(date?: Date | string | null) {
  if (!date) return null;

  return dayjs(date)
    .tz(DEFAULT_TZ)
    .format(DEFAULT_FORMAT);
}

export function toLocalDate(date?: Date | string | null) {
  if (!date) return null;

  return dayjs(date)
    .tz(DEFAULT_TZ)
    .format("YYYY-MM-DD");
}