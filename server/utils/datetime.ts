import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TZ = "Asia/Jakarta";

export function toLocalTime(
  date?: Date | string | null,
  tz = DEFAULT_TZ
) {
  if (!date) return null;
  return dayjs(date).tz(tz).format("YYYY-MM-DD HH:mm:ss");
}
