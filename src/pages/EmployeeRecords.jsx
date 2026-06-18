import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { api } from '../api.js';
import { buildCalendarWeeks, getStatusClass, getStatusText, minutesToText } from '../utils.js';

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

export default function EmployeeRecords() {
  const employee = useMemo(() => JSON.parse(localStorage.getItem('currentEmployee')), []);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [monthlyText, setMonthlyText] = useState('0시간 0분');
  const [message, setMessage] = useState('');

  const weeks = useMemo(() => buildCalendarWeeks(year, month), [year, month]);
  const recordsByDate = useMemo(() => {
    return new Map(records.map((record) => [record.date, record]));
  }, [records]);

  const loadRecords = async () => {
    const data = await api.getEmployeeRecords(employee.id, year, month);
    setRecords(data.records);
    setMonthlyText(data.monthlyWorkDurationText);
  };

  useEffect(() => {
    setMessage('');
    loadRecords().catch((error) => setMessage(error.message));
  }, [year, month]);

  const moveMonth = (delta) => {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  };

  return (
    <main className="page-shell wide-shell">
      <Header title="직원 출근 기록" />

      <section className="calendar-toolbar">
        <button className="outline-button" type="button" onClick={() => moveMonth(-1)}>
          이전 달
        </button>
        <div className="month-title">
          <p className="eyebrow">월별 캘린더</p>
          <h2>
            {year}. {month}
          </h2>
          <strong>월간 총 근로시간 {monthlyText}</strong>
        </div>
        <button className="outline-button" type="button" onClick={() => moveMonth(1)}>
          다음 달
        </button>
      </section>

      {message && <p className="alert error">{message}</p>}

      <section className="legend">
        <span><i className="dot done" />퇴근 완료</span>
        <span><i className="dot pending" />미퇴근</span>
        <span><i className="dot error-dot" />미완료</span>
      </section>

      <section className="calendar-wrap">
        <div className="calendar-header">
          {weekdays.map((day) => (
            <div key={day}>{day}</div>
          ))}
          <div>주간 합계</div>
        </div>

        {weeks.map((week) => {
          const weekMinutes = week.reduce((sum, day) => {
            if (!day.isCurrentMonth) return sum;
            const record = recordsByDate.get(day.dateString);
            return sum + (record?.workDurationMinutes || 0);
          }, 0);

          return (
            <div className="calendar-row" key={week[0].dateString}>
              {week.map((day) => {
                const record = day.isCurrentMonth ? recordsByDate.get(day.dateString) : null;
                return (
                  <article
                    className={`calendar-cell ${day.isCurrentMonth ? '' : 'muted-cell'} ${
                      record ? getStatusClass(record.status) : ''
                    }`}
                    key={day.dateString}
                  >
                    <strong>{day.dayNumber}</strong>
                    {day.isCurrentMonth && record && (
                      <>
                        <span className="duration-text">{minutesToText(record.workDurationMinutes || 0)}</span>
                        <small>{getStatusText(record)}</small>
                      </>
                    )}
                  </article>
                );
              })}
              <aside className="week-total">
                <span>주간</span>
                <strong>{minutesToText(weekMinutes)}</strong>
              </aside>
            </div>
          );
        })}
      </section>
    </main>
  );
}
