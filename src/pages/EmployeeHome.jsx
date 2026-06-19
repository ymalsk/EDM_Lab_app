import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Header from '../components/Header.jsx';
import { formatKoreanDate, formatTime } from '../utils.js';

export default function EmployeeHome() {
  const navigate = useNavigate();

  const employee = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('currentEmployee'));
    } catch {
      return null;
    }
  }, []);

  const [today, setToday] = useState('');
  const [records, setRecords] = useState([]);
  const [currentOpenRecord, setCurrentOpenRecord] = useState(null);
  const [dailyWorkDurationText, setDailyWorkDurationText] = useState('0시간 0분');
  const [statusLabel, setStatusLabel] = useState('');
  const [message, setMessage] = useState('');
  const [loadingType, setLoadingType] = useState('');

  const loadToday = async () => {
    if (!employee?.id) return;

    const data = await api.getTodayRecord(employee.id);

    setToday(data.today);
    setRecords(Array.isArray(data.records) ? data.records : data.record ? [data.record] : []);
    setCurrentOpenRecord(data.currentOpenRecord || null);
    setDailyWorkDurationText(data.dailyWorkDurationText || '0시간 0분');
    setStatusLabel(data.statusLabel || '');
  };

  useEffect(() => {
    if (!employee?.id) {
      navigate('/login');
      return;
    }

    loadToday().catch((error) => setMessage(error.message));
  }, []);

  const runAction = async (type) => {
    setMessage('');
    setLoadingType(type);

    try {
      const data =
        type === 'check-in'
          ? await api.checkIn(employee.id)
          : await api.checkOut(employee.id);

      setMessage(data.message);
      await loadToday();
    } catch (error) {
      setMessage(error.message);
      await loadToday().catch(() => {});
    } finally {
      setLoadingType('');
    }
  };

  const canCheckIn = !currentOpenRecord;
  const canCheckOut = Boolean(currentOpenRecord);

  const currentStatus = currentOpenRecord
    ? '출근 중'
    : records.length > 0
      ? '퇴근 상태'
      : '출근 전';

  return (
    <main className="page-shell">
      <Header title="직원 메인" mode="/employee" />

      <section className="hero-card">
        <div>
          <p className="eyebrow">오늘 근무</p>
          <h2>{employee?.name}님, 안녕하세요.</h2>
          <p className="muted">{formatKoreanDate(today)}</p>
        </div>

        <Link className="outline-button" to="/employee/records">
          출근 기록 확인
        </Link>
      </section>

      {message && (
        <p className={`alert ${message.includes('되었습니다') ? 'success' : 'error'}`}>
          {message}
        </p>
      )}

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
          <span>현재 상태</span>
          <strong>{currentStatus}</strong>
        </article>

        <article className="stat-card">
          <span>오늘 총 근로시간</span>
          <strong>{dailyWorkDurationText}</strong>
        </article>

        <article className="stat-card">
          <span>오늘 기록 수</span>
          <strong>{records.length}회</strong>
        </article>

        <article className="stat-card">
          <span>오늘 상태</span>
          <strong>{statusLabel || '기록 없음'}</strong>
        </article>
      </section>

      <section className="table-card today-record-card">
        <div className="section-title-row table-title-row">
          <div>
            <p className="eyebrow">Today Records</p>
            <h2>오늘 출퇴근 기록</h2>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="empty-text">오늘 출퇴근 기록이 없습니다.</p>
        ) : (
          <div className="today-record-list">
            {records.map((record) => (
              <article className="today-record-item" key={record.id}>
                <div>
                  <strong>{record.sessionLabel || `${record.sessionOrder || 1}차`}</strong>
                  <span className={`status-pill ${record.status}`}>
                    {record.statusLabel}
                  </span>
                </div>

                <p>
                  {formatTime(record.checkInTime)} ~{' '}
                  {record.checkOutTime ? formatTime(record.checkOutTime) : '미퇴근'}
                </p>

                <small>{record.workDurationText || '0시간 0분'}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}