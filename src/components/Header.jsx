import { Link, useNavigate } from 'react-router-dom';

export default function Header({ title, mode = 'employee' }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (mode === 'admin') {
      localStorage.removeItem('currentAdmin');
      navigate('/admin/login');
    } else {
      localStorage.removeItem('currentEmployee');
      navigate('/login');
    }
  };

  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">Attendance Manager</p>
        <h1>{title}</h1>
      </div>
      <nav className="top-nav">
        {mode === 'employee' && (
          <>
            <Link to="/employee">메인</Link>
            <Link to="/employee/records">기록</Link>
          </>
        )}
        {mode === 'admin' && <Link to="/admin">관리자</Link>}
        <button className="text-button" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </nav>
    </header>
  );
}
