const KST_TIMEZONE = 'Asia/Seoul';

function pad(value) {
  return String(value).padStart(2, '0');
}

// 서버의 시간대와 관계없이 한국 시간 기준 오늘 날짜와 시간을 만든다.
export function getKstNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const get = (type) => parts.find((part) => part.type === type)?.value;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');

  return {
    now,
    date: `${year}-${month}-${day}`,
    timeText: `${hour}:${minute}:${second}`,
    dateTimeText: `${year}-${month}-${day} ${hour}:${minute}:${second}`
  };
}

export function formatTimeForDisplay(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('hour')}:${get('minute')}:${get('second')}`;
}

export function minutesToText(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0시간 0분';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}

export function parseDateUtc(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateUtc(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDaysUtc(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getWeekRange(dateString) {
  const date = parseDateUtc(dateString);
  const day = date.getUTCDay(); // 일:0, 월:1 ... 토:6
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDaysUtc(date, diffToMonday);
  const sunday = addDaysUtc(monday, 6);
  return {
    start: formatDateUtc(monday),
    end: formatDateUtc(sunday)
  };
}

export function getMonthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: formatDateUtc(start),
    end: formatDateUtc(end)
  };
}
