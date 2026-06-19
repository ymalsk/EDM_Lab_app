import { Link, useNavigate } from 'react-router-dom';

export default function Header({ title, mode = 'employee' }) {
  const navigate = useNavigate();

  const isAdmin = mode === 'admin';

  const handleLogout = () => {
    if (isAdmin) {
      sessionStorage.removeItem('currentAdmin');
      navigate('/admin/login');
      return;
    }

    sessionStorage.removeItem('currentEmployee');
    navigate('/login');
  };

  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">Attendance Manager</p>
        <h1>{title}</h1>
      </div>

      <nav className="top-nav">
        {isAdmin ? (
          <>
            <Link to="/admin">메인</Link>
            <Link to="/admin/records">전체 기록</Link>
          </>
        ) : (
          <>
            <Link to="/employee">메인</Link>
            <Link to="/employee/records">기록</Link>
          </>
        )}

        <button className="text-button" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </nav>
    </header>
  );
}