export function minutesToText(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0시간 0분';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}

export function formatKoreanDate(dateString) {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

export function formatTime(isoString) {
  if (!isoString) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(isoString));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// 월요일 시작 캘린더를 만든다. 각 row는 월~일 7개 날짜와 주간 합산 영역으로 렌더링된다.
export function buildCalendarWeeks(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const firstWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  const calendarStart = addDays(firstDay, -(firstWeekday - 1));

  const weeks = [];
  let cursor = calendarStart;

  while (cursor <= lastDay || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({
        date: new Date(cursor),
        dateString: toDateString(cursor),
        dayNumber: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === month - 1
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);

    if (cursor > lastDay && cursor.getDay() === 1) break;
  }

  return weeks;
}

export function getStatusClass(status) {
  if (status === 'checked-out') return 'status-done';
  if (status === 'checked-in') return 'status-pending';
  return 'status-error';
}

export function getStatusText(record) {
  if (!record) return '';
  if (record.status === 'checked-out') return '퇴근 완료';
  if (record.status === 'checked-in') return '미퇴근';
  return '미완료';
}
