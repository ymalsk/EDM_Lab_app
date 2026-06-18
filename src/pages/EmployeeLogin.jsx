import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const data = await api.employeeLogin({ name, studentId });
      localStorage.setItem('currentEmployee', JSON.stringify(data.user));
      navigate('/employee');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">Employee Login</p>
        <h1>직원 로그인</h1>
        <p className="muted">관리자가 등록한 직원만 로그인할 수 있습니다.</p>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            이름
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 티노"
              autoComplete="name"
            />
          </label>
          <label>
            학번
            <input
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="예: 202616XXXX"
              autoComplete="username"
            />
          </label>
          {message && <p className="alert error">{message}</p>}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <Link className="sub-link" to="/admin/login">
          관리자 로그인으로 이동
        </Link>
      </section>
    </main>
  );
}
