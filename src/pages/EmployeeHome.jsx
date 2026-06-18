import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Header from '../components/Header.jsx';
import { formatKoreanDate, formatTime, minutesToText } from '../utils.js';

export default function EmployeeHome() {
  const employee = useMemo(() => JSON.parse(localStorage.getItem('currentEmployee')), []);
  const [today, setToday] = useState('');
  const [record, setRecord] = useState(null);
  const [message, setMessage] = useState('');
  const [loadingType, setLoadingType] = useState('');

  const loadToday = async () => {
    const data = await api.getTodayRecord(employee.id);
    setToday(data.today);
    setRecord(data.record);
  };

  useEffect(() => {
    loadToday().catch((error) => setMessage(error.message));
  }, []);

  const runAction = async (type) => {
    setMessage('');
    setLoadingType(type);

    try {
      const data = type === 'check-in' ? await api.checkIn(employee.id) : await api.checkOut(employee.id);
      setRecord(data.record);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
      await loadToday().catch(() => {});
    } finally {
      setLoadingType('');
    }
  };

  const canCheckIn = !record;
  const canCheckOut = Boolean(record?.checkInTime && !record?.checkOutTime);

  return (
    <main className="page-shell">
      <Header title="직원 메인" />

      <section className="hero-card">
        <div>
          <p className="eyebrow">오늘 근무</p>
          <h2>{employee.name}님, 안녕하세요.</h2>
          <p className="muted">{formatKoreanDate(today)}</p>
        </div>
        <Link className="outline-button" to="/employee/records">
          출근 기록 확인
        </Link>
      </section>

      {message && <p className={`alert ${message.includes('되었습니다') ? 'success' : 'error'}`}>{message}</p>}

      <section className="action-grid">
        <button
          className="big-action checkin"
          disabled={!canCheckIn || loadingType !== ''}
          onClick={() => runAction('check-in')}
          type="button"
        >
          <span>출근</span>
          <strong>{loadingType === 'check-in' ? '처리 중...' : '출근하기'}</strong>
        </button>
        <button
          className="big-action checkout"
          disabled={!canCheckOut || loadingType !== ''}
          onClick={() => runAction('check-out')}
          type="button"
        >
          <span>퇴근</span>
          <strong>{loadingType === 'check-out' ? '처리 중...' : '퇴근하기'}</strong>
        </button>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>오늘의 출근 시간</span>
          <strong>{formatTime(record?.checkInTime)}</strong>
        </article>
        <article className="stat-card">
          <span>오늘의 퇴근 시간</span>
          <strong>{formatTime(record?.checkOutTime)}</strong>
        </article>
        <article className="stat-card">
          <span>오늘의 총 근로시간</span>
          <strong>{minutesToText(record?.workDurationMinutes || 0)}</strong>
        </article>
        <article className="stat-card">
          <span>현재 상태</span>
          <strong>{record ? record.statusLabel : '출근 전'}</strong>
        </article>
      </section>
    </main>
  );
}
