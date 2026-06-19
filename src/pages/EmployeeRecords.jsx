import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Header from '../components/Header.jsx';
import { formatKoreanDate, formatTime } from '../utils.js';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const firstDayIndex = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const days = [];

  for (let i = 0; i < firstDayIndex; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({
      day,
      date
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function chunkWeeks(days) {
  const weeks = [];

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

function getStatusClass(statusLabel) {
  if (statusLabel === '퇴근 완료') return 'done';
  if (statusLabel === '미퇴근') return 'open';
  if (statusLabel === '미완료') return 'error';
  return '';
}

export default function EmployeeRecords() {
  const navigate = useNavigate();

  const employee = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('currentEmployee'));
    } catch {
      return null;
    }
  }, []);

  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [monthlyWorkDurationText, setMonthlyWorkDurationText] = useState('0시간 0분');
  const [selectedDate, setSelectedDate] = useState('');
  const [message, setMessage] = useState('');

  const dailySummaryMap = useMemo(() => {
    return new Map(dailySummaries.map((summary) => [summary.date, summary]));
  }, [dailySummaries]);

  const recordsByDate = useMemo(() => {
    const map = new Map();

    records.forEach((record) => {
      if (!map.has(record.date)) {
        map.set(record.date, []);
      }

      map.get(record.date).push(record);
    });

    return map;
  }, [records]);

  const calendarDays = useMemo(() => {
    return getCalendarDays(year, month);
  }, [year, month]);

  const weeks = useMemo(() => {
    return chunkWeeks(calendarDays);
  }, [calendarDays]);

  const selectedRecords = selectedDate ? recordsByDate.get(selectedDate) || [] : [];

  const loadRecords = async () => {
    if (!employee?.id) return;

    const data = await api.getEmployeeRecords(employee.id, year, month);

    setRecords(Array.isArray(data.records) ? data.records : []);
    setDailySummaries(Array.isArray(data.dailySummaries) ? data.dailySummaries : []);
    setMonthlyWorkDurationText(data.monthlyWorkDurationText || '0시간 0분');

    if (!selectedDate) {
      const firstDate = data.dailySummaries?.[0]?.date;
      if (firstDate) setSelectedDate(firstDate);
    }
  };

  useEffect(() => {
    if (!employee?.id) {
      navigate('/login');
      return;
    }

    loadRecords().catch((error) => setMessage(error.message));
  }, [year, month]);

  const moveMonth = (diff) => {
    setSelectedDate('');
    setMessage('');

    const next = new Date(year, month - 1 + diff, 1);

    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  const getWeekTotalText = (week) => {
    const totalMinutes = week.reduce((sum, day) => {
      if (!day) return sum;

      const summary = dailySummaryMap.get(day.date);
      return sum + (summary?.totalMinutes || 0);
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}시간 ${minutes}분`;
  };

  return (
    <main className="page-shell">
      <Header title="출근 기록" />

      <section className="hero-card">
        <div>
          <p className="eyebrow">Monthly Records</p>
          <h2>{year}. {month}</h2>
          <p className="muted">{employee?.name}님의 월간 출근 기록입니다.</p>
        </div>

        <Link className="outline-button" to="/employee">
          메인으로
        </Link>
      </section>

      {message && <p className="alert error">{message}</p>}

      <section className="month-control-card">
        <button type="button" className="outline-button" onClick={() => moveMonth(-1)}>
          이전 달
        </button>

        <div className="month-summary">
          <span>월간 총 근로시간</span>
          <strong>{monthlyWorkDurationText}</strong>
        </div>

        <button type="button" className="outline-button" onClick={() => moveMonth(1)}>
          다음 달
        </button>
      </section>

      <section className="calendar-card">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}

          <div className="week-total-head">주간 합계</div>
        </div>

        <div className="calendar-weeks">
          {weeks.map((week, weekIndex) => (
            <div className="calendar-week-row" key={`week-${weekIndex}`}>
              {week.map((day, index) => {
                if (!day) {
                  return <div className="calendar-day empty" key={`empty-${weekIndex}-${index}`} />;
                }

                const summary = dailySummaryMap.get(day.date);
                const statusClass = getStatusClass(summary?.statusLabel);
                const isSelected = selectedDate === day.date;

                return (
                  <button
                    type="button"
                    className={`calendar-day ${statusClass} ${isSelected ? 'selected' : ''}`}
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <span className="day-number">{day.day}</span>

                    {summary ? (
                      <>
                        <strong>{summary.totalText}</strong>
                        <small>{summary.recordCount}회 기록</small>
                        <em>{summary.statusLabel}</em>
                      </>
                    ) : (
                      <small className="no-record">기록 없음</small>
                    )}
                  </button>
                );
              })}

              <div className="week-total-cell">
                <span>주간</span>
                <strong>{getWeekTotalText(week)}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="table-card selected-record-card">
        <div className="section-title-row table-title-row">
          <div>
            <p className="eyebrow">Daily Detail</p>
            <h2>
              {selectedDate ? formatKoreanDate(selectedDate) : '날짜를 선택해주세요'}
            </h2>
          </div>
        </div>

        {!selectedDate ? (
          <p className="empty-text">캘린더에서 날짜를 선택하면 상세 기록이 표시됩니다.</p>
        ) : selectedRecords.length === 0 ? (
          <p className="empty-text">해당 날짜의 출퇴근 기록이 없습니다.</p>
        ) : (
          <div className="daily-detail-list">
            {selectedRecords.map((record) => (
              <article className="daily-detail-item" key={record.id}>
                <div className="daily-detail-top">
                  <strong>{record.sessionLabel || `${record.sessionOrder || 1}차`}</strong>
                  <span className={`status-pill ${record.status}`}>
                    {record.statusLabel}
                  </span>
                </div>

                <div className="daily-detail-times">
                  <span>
                    출근 <b>{formatTime(record.checkInTime)}</b>
                  </span>

                  <span>
                    퇴근 <b>{record.checkOutTime ? formatTime(record.checkOutTime) : '미퇴근'}</b>
                  </span>
                </div>

                <p>{record.workDurationText || '0시간 0분'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}