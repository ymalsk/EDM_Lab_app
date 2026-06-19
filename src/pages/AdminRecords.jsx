import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Header from '../components/Header.jsx';
import { formatTime } from '../utils.js';

export default function AdminRecords() {
  const navigate = useNavigate();

  const admin = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('currentAdmin'));
    } catch {
      return null;
    }
  }, []);

  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    setMessage('');

    try {
      const data = await api.getAdminRecords({
        query: searchQuery,
        date: filterDate
      });

      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!admin) {
      navigate('/admin/login');
      return;
    }

    loadRecords();
  }, []);

  useEffect(() => {
    if (!admin) return;

    loadRecords();
  }, [searchQuery, filterDate]);

  return (
    <main className="page-shell">
      <Header title="전체 출퇴근 기록" mode="admin" />

      <section className="hero-card">
        <div>
          <p className="eyebrow">Attendance Records</p>
          <h2>전체 출퇴근 기록</h2>
          <p className="muted">출근 시간이 최신인 기록부터 표시됩니다.</p>
        </div>

        <Link className="outline-button" to="/admin">
          관리자 메인으로
        </Link>
      </section>

      {message && <p className="alert error">{message}</p>}

      <section className="table-card admin-records-section">
        <div className="section-title-row table-title-row">
          <div>
            <p className="eyebrow">Records</p>
            <h2>상세 출퇴근 기록</h2>
          </div>

          {loading && <p className="muted">불러오는 중...</p>}
        </div>

        <div className="filter-row">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="직원 이름 또는 학번 검색"
          />

          <input
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
          />

          <button
            className="outline-button"
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterDate('');
            }}
          >
            필터 초기화
          </button>
        </div>

        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>직원 이름</th>
                <th>학번</th>
                <th>날짜</th>
                <th>회차</th>
                <th>출근 시간</th>
                <th>퇴근 시간</th>
                <th>총 근로시간</th>
                <th>상태</th>
                <th>주간 근로시간</th>
              </tr>
            </thead>

            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-cell">
                    출퇴근 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.employeeName}</td>
                    <td>{record.studentId}</td>
                    <td>{record.date}</td>
                    <td>{record.sessionLabel || `${record.sessionOrder || 1}차`}</td>
                    <td>{formatTime(record.checkInTime)}</td>
                    <td>{record.checkOutTime ? formatTime(record.checkOutTime) : '미퇴근'}</td>
                    <td>{record.workDurationText}</td>
                    <td>
                      <span className={`status-pill ${record.status}`}>
                        {record.statusLabel}
                      </span>
                    </td>
                    <td>{record.weeklyWorkDurationText}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}