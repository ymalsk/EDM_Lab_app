import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { api } from '../api.js';
import { formatTime } from '../utils.js';

const emptyEmployeeForm = { name: '', studentId: '' };
const emptySettingsForm = { adminId: '', currentPassword: '', newPassword: '', confirmPassword: '' };

export default function AdminDashboard() {
  const admin = useMemo(() => JSON.parse(localStorage.getItem('currentAdmin')), []);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [settingsForm, setSettingsForm] = useState(emptySettingsForm);

  const showError = (text) => {
    setSuccessMessage('');
    setMessage(text);
  };

  const showSuccess = (text) => {
    setMessage('');
    setSuccessMessage(text);
  };

  const loadRecords = async (filters = { query, date }) => {
    const data = await api.getAdminRecords(filters);
    setRecords(data.records);
  };

  const loadEmployees = async () => {
    const data = await api.getEmployees();
    setEmployees(data.employees);
  };

  const loadSettings = async () => {
    const data = await api.getAdminSettings();
    setSettingsForm((prev) => ({ ...prev, adminId: data.settings.adminId }));
  };

  const loadAll = async () => {
    setLoading(true);
    setMessage('');

    try {
      await Promise.all([loadRecords(), loadEmployees(), loadSettings()]);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await loadRecords({ query, date });
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFilter = async () => {
    setQuery('');
    setDate('');
    setLoading(true);

    try {
      await loadRecords({ query: '', date: '' });
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (editingEmployeeId) {
        const data = await api.updateEmployee(editingEmployeeId, employeeForm);
        showSuccess(data.message);
      } else {
        const data = await api.createEmployee(employeeForm);
        showSuccess(data.message);
      }

      setEmployeeForm(emptyEmployeeForm);
      setEditingEmployeeId(null);
      await Promise.all([loadEmployees(), loadRecords({ query, date })]);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditEmployee = (employee) => {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({ name: employee.name, studentId: employee.studentId });
    setMessage('');
    setSuccessMessage('');
  };

  const cancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeForm(emptyEmployeeForm);
  };

  const deleteEmployee = async (employee) => {
    const ok = window.confirm(`${employee.name}(${employee.studentId}) 직원을 삭제할까요?\n해당 직원의 출퇴근 기록도 함께 삭제됩니다.`);
    if (!ok) return;

    setLoading(true);
    setMessage('');

    try {
      const data = await api.deleteEmployee(employee.id);
      showSuccess(data.message);
      if (editingEmployeeId === employee.id) cancelEditEmployee();
      await Promise.all([loadEmployees(), loadRecords({ query, date })]);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();

    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmPassword) {
      showError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const data = await api.updateAdminSettings({
        adminId: settingsForm.adminId,
        currentPassword: settingsForm.currentPassword,
        newPassword: settingsForm.newPassword
      });

      localStorage.setItem('currentAdmin', JSON.stringify(data.admin));
      setSettingsForm({
        adminId: data.settings.adminId,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      showSuccess(data.message);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell wide-shell">
      <Header title="관리자 페이지" mode="admin" />

      <section className="hero-card admin-card">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h2>{admin.name}님, 직원과 출퇴근 기록을 관리합니다.</h2>
          <p className="muted">직원 로그인은 관리자가 등록한 이름과 학번으로만 가능합니다.</p>
        </div>
        <strong className="record-count">기록 {records.length}건</strong>
      </section>

      {message && <p className="alert error">{message}</p>}
      {successMessage && <p className="alert success">{successMessage}</p>}

      <section className="admin-sections">
        <div className="section-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Employees</p>
              <h2>직원 등록 / 수정 / 삭제</h2>
            </div>
            <strong className="record-count">직원 {employees.length}명</strong>
          </div>

          <form className="management-form" onSubmit={handleEmployeeSubmit}>
            <label>
              직원 이름
              <input
                value={employeeForm.name}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="예: 티노"
              />
            </label>
            <label>
              학번
              <input
                value={employeeForm.studentId}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, studentId: event.target.value }))}
                placeholder="예: 202616XXXX"
              />
            </label>
            <button className="primary-button small-button" type="submit" disabled={loading}>
              {editingEmployeeId ? '직원 수정' : '직원 등록'}
            </button>
            {editingEmployeeId && (
              <button className="outline-button small-button" type="button" onClick={cancelEditEmployee}>
                수정 취소
              </button>
            )}
          </form>

          <div className="table-scroll compact-table">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>학번</th>
                  <th>기록 수</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="muted">등록된 직원이 없습니다.</td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.name}</td>
                      <td>{employee.studentId}</td>
                      <td>{employee.recordCount}건</td>
                      <td className="button-cell">
                        <button className="outline-button mini-button" type="button" onClick={() => startEditEmployee(employee)}>
                          수정
                        </button>
                        <button className="danger-button mini-button" type="button" onClick={() => deleteEmployee(employee)}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Admin Account</p>
              <h2>관리자 계정 설정</h2>
            </div>
          </div>

          <form className="form-stack compact-form" onSubmit={handleSettingsSubmit}>
            <label>
              관리자 ID
              <input
                value={settingsForm.adminId}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, adminId: event.target.value }))}
              />
            </label>
            <label>
              현재 비밀번호
              <input
                value={settingsForm.currentPassword}
                type="password"
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                placeholder="설정 변경 시 필요"
              />
            </label>
            <label>
              새 비밀번호
              <input
                value={settingsForm.newPassword}
                type="password"
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="변경하지 않으려면 비워두기"
              />
            </label>
            <label>
              새 비밀번호 확인
              <input
                value={settingsForm.confirmPassword}
                type="password"
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                placeholder="새 비밀번호 재입력"
              />
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              관리자 계정 수정
            </button>
          </form>
        </div>
      </section>

      <form className="filter-card" onSubmit={handleSearch}>
        <label>
          직원 검색
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름 또는 학번"
          />
        </label>
        <label>
          날짜 필터
          <input value={date} type="date" onChange={(event) => setDate(event.target.value)} />
        </label>
        <button className="primary-button small-button" type="submit" disabled={loading}>
          조회
        </button>
        <button className="outline-button small-button" type="button" onClick={resetFilter} disabled={loading}>
          초기화
        </button>
      </form>

      <section className="table-card">
        <div className="section-title-row table-title-row">
          <div>
            <p className="eyebrow">Attendance</p>
            <h2>전체 직원 출퇴근 기록</h2>
          </div>
          {loading && <span className="muted">불러오는 중...</span>}
        </div>

        {records.length === 0 ? (
          <p className="muted">조회된 출퇴근 기록이 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>직원 이름</th>
                  <th>학번</th>
                  <th>날짜</th>
                  <th>출근 시간</th>
                  <th>퇴근 시간</th>
                  <th>총 근로시간</th>
                  <th>상태</th>
                  <th>주간 근로시간</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.employeeName}</td>
                    <td>{record.studentId}</td>
                    <td>{record.date}</td>
                    <td>{formatTime(record.checkInTime)}</td>
                    <td>{formatTime(record.checkOutTime)}</td>
                    <td>{record.workDurationText}</td>
                    <td>
                      <span className={`status-pill ${record.status}`}>{record.statusLabel}</span>
                    </td>
                    <td>{record.weeklyWorkDurationText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
