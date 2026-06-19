import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('admin');
  const [password, setPassword] = useState('admin1234');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const data = await api.adminLogin({ adminId, password });
      sessionStorage.setItem('currentAdmin', JSON.stringify(data.admin));
      sessionStorage.removeItem('currentEmployee');
      navigate('/admin');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout admin-bg">
      <section className="auth-card">
        <p className="eyebrow">Admin Login</p>
        <h1>관리자 로그인</h1>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            관리자 ID
            <input value={adminId} onChange={(event) => setAdminId(event.target.value)} />
          </label>
          <label>
            비밀번호
            <input
              value={password}
              type="password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message && <p className="alert error">{message}</p>}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? '확인 중...' : '관리자 로그인'}
          </button>
        </form>

        <Link className="sub-link" to="/login">
          직원 로그인으로 이동
        </Link>
      </section>
    </main>
  );
}
