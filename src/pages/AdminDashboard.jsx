import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Header from '../components/Header.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const admin = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('currentAdmin'));
    } catch {
      return null;
    }
  }, []);

  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState(null);

  const [todaySummary, setTodaySummary] = useState([]);
  const [today, setToday] = useState('');

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    studentId: ''
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState('');
  const [editingForm, setEditingForm] = useState({
    name: '',
    studentId: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    adminId: '',
    currentPassword: '',
    newPassword: ''
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTodaySummary = async () => {
    const data = await api.getAdminTodaySummary();

    setToday(data.today || '');
    setTodaySummary(Array.isArray(data.summaries) ? data.summaries : []);
  };

  const loadEmployees = async () => {
    const data = await api.getAdminEmployees();
    setEmployees(Array.isArray(data.employees) ? data.employees : []);
  };

  const loadSettings = async () => {
    const data = await api.getAdminSettings();

    setSettings(data.settings || null);
    setSettingsForm((prev) => ({
      ...prev,
      adminId: data.settings?.adminId || ''
    }));
  };

  const loadAll = async () => {
    setLoading(true);
    setMessage('');

    try {
      await Promise.all([loadTodaySummary(), loadEmployees(), loadSettings()]);
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

    loadAll();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('currentAdmin');
    navigate('/admin/login');
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const data = await api.createEmployee(employeeForm);

      setMessage(data.message || '직원이 등록되었습니다.');
      setEmployeeForm({
        name: '',
        studentId: ''
      });

      await Promise.all([loadEmployees(), loadTodaySummary()]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEditEmployee = (employee) => {
    setEditingEmployeeId(employee.id);
    setEditingForm({
      name: employee.name,
      studentId: employee.studentId
    });
  };

  const cancelEditEmployee = () => {
    setEditingEmployeeId('');
    setEditingForm({
      name: '',
      studentId: ''
    });
  };

  const handleUpdateEmployee = async (employeeId) => {
    setMessage('');

    try {
      const data = await api.updateEmployee(employeeId, editingForm);

      setMessage(data.message || '직원 정보가 수정되었습니다.');
      cancelEditEmployee();

      await Promise.all([loadEmployees(), loadTodaySummary()]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    const confirmed = window.confirm(
      '직원을 삭제하면 해당 직원의 출퇴근 기록도 함께 삭제됩니다. 계속하시겠습니까?'
    );

    if (!confirmed) return;

    setMessage('');

    try {
      const data = await api.deleteEmployee(employeeId);

      setMessage(data.message || '직원이 삭제되었습니다.');

      await Promise.all([loadEmployees(), loadTodaySummary()]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleUpdateSettings = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const data = await api.updateAdminSettings(settingsForm);

      setMessage(data.message || '관리자 계정 설정이 수정되었습니다.');

      setSettings(data.settings || null);
      setSettingsForm({
        adminId: data.settings?.adminId || '',
        currentPassword: '',
        newPassword: ''
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <main className="page-shell">
      <Header title="관리자 페이지" homePath="/admin" />

      <section className="hero-card">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h2>{admin?.name || '관리자'}님, 안녕하세요.</h2>
          <p className="muted">
            직원 등록, 직원 목록, 당일 근무 현황, 관리자 계정 설정을 관리합니다.
          </p>
        </div>

        <button
          className="outline-button danger-outline"
          type="button"
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </section>

      {message && (
        <p
          className={`alert ${
            message.includes('되었습니다') ||
            message.includes('수정') ||
            message.includes('삭제')
              ? 'success'
              : 'error'
          }`}
        >
          {message}
        </p>
      )}

      <section className="admin-grid">
        <article className="table-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Employee</p>
              <h2>직원 등록</h2>
            </div>
          </div>

          <form className="admin-form" onSubmit={handleCreateEmployee}>
            <label>
              이름
              <input
                value={employeeForm.name}
                onChange={(event) =>
                  setEmployeeForm((prev) => ({
                    ...prev,
                    name: event.target.value
                  }))
                }
                placeholder="예: 김유민"
              />
            </label>

            <label>
              학번
              <input
                value={employeeForm.studentId}
                onChange={(event) =>
                  setEmployeeForm((prev) => ({
                    ...prev,
                    studentId: event.target.value
                  }))
                }
                placeholder="예: 20261234"
              />
            </label>

            <button className="primary-button" type="submit">
              직원 등록
            </button>
          </form>
        </article>

        <article className="table-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Admin Account</p>
              <h2>관리자 계정 설정</h2>
            </div>
          </div>

          <form className="admin-form" onSubmit={handleUpdateSettings}>
            <label>
              관리자 ID
              <input
                value={settingsForm.adminId}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    adminId: event.target.value
                  }))
                }
                placeholder="관리자 ID"
              />
            </label>

            <label>
              현재 비밀번호
              <input
                type="password"
                value={settingsForm.currentPassword}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    currentPassword: event.target.value
                  }))
                }
                placeholder="현재 비밀번호"
              />
            </label>

            <label>
              새 비밀번호
              <input
                type="password"
                value={settingsForm.newPassword}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    newPassword: event.target.value
                  }))
                }
                placeholder="변경하지 않으려면 비워두세요"
              />
            </label>

            <button className="primary-button" type="submit">
              관리자 설정 저장
            </button>
          </form>

          {settings && (
            <p className="muted small-note">
              현재 관리자 ID: <b>{settings.adminId}</b>
            </p>
          )}
        </article>
      </section>

      <section className="table-card">
        <div className="section-title-row table-title-row">
          <div>
            <p className="eyebrow">Employees</p>
            <h2>직원 목록</h2>
          </div>
        </div>

        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>학번</th>
                <th>등록일</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-cell">
                    등록된 직원이 없습니다.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => {
                  const isEditing = editingEmployeeId === employee.id;

                  return (
                    <tr key={employee.id}>
                      <td>
                        {isEditing ? (
                          <input
                            className="table-input"
                            value={editingForm.name}
                            onChange={(event) =>
                              setEditingForm((prev) => ({
                                ...prev,
                                name: event.target.value
                              }))
                            }
                          />
                        ) : (
                          employee.name
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="table-input"
                            value={editingForm.studentId}
                            onChange={(event) =>
                              setEditingForm((prev) => ({
                                ...prev,
                                studentId: event.target.value
                              }))
                            }
                          />
                        ) : (
                          employee.studentId
                        )}
                      </td>

                      <td>
                        {employee.createdAt ? employee.createdAt.slice(0, 10) : '-'}
                      </td>

                      <td>
                        <div className="table-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="mini-button"
                                type="button"
                                onClick={() => handleUpdateEmployee(employee.id)}
                              >
                                저장
                              </button>

                              <button
                                className="mini-button ghost"
                                type="button"
                                onClick={cancelEditEmployee}
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="mini-button"
                                type="button"
                                onClick={() => startEditEmployee(employee)}
                              >
                                수정
                              </button>

                              <button
                                className="mini-button danger"
                                type="button"
                                onClick={() => handleDeleteEmployee(employee.id)}
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-card admin-today-summary-section">
        <div className="section-title-row table-title-row">
          <div>
            <p className="eyebrow">Today Summary</p>
            <h2>직원별 당일 근무 현황</h2>
            <p className="muted">{today} 기준</p>
          </div>

          <Link className="outline-button" to="/admin/records">
            전체 출퇴근 기록 보기
          </Link>
        </div>

        {loading && <p className="muted">불러오는 중...</p>}

        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>학번</th>
                <th>상태</th>
                <th>당일 총 근무시간</th>
                <th>주간 누적 근로시간</th>
              </tr>
            </thead>

            <tbody>
              {todaySummary.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-cell">
                    등록된 직원이 없습니다.
                  </td>
                </tr>
              ) : (
                todaySummary.map((item) => (
                  <tr key={item.userId}>
                    <td>{item.name}</td>
                    <td>{item.studentId}</td>
                    <td>
                      <span
                        className={`summary-status ${
                          item.statusLabel === '출근 중'
                            ? 'working'
                            : item.statusLabel === '퇴근 상태'
                              ? 'done'
                              : 'ready'
                        }`}
                      >
                        {item.statusLabel}
                      </span>
                    </td>
                    <td>{item.dailyWorkDurationText}</td>
                    <td>{item.weeklyWorkDurationText}</td>
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