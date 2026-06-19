import { Navigate, Route, Routes } from 'react-router-dom';
import EmployeeLogin from './pages/EmployeeLogin.jsx';
import EmployeeHome from './pages/EmployeeHome.jsx';
import EmployeeRecords from './pages/EmployeeRecords.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRecords from './pages/AdminRecords.jsx';

function RequireEmployee({ children }) {
  const employee = sessionStorage.getItem('currentEmployee');

  if (!employee) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAdmin({ children }) {
  const admin = sessionStorage.getItem('currentAdmin');

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<EmployeeLogin />} />
      <Route
        path="/employee"
        element={
          <RequireEmployee>
            <EmployeeHome />
          </RequireEmployee>
        }
      />
      <Route
        path="/employee/records"
        element={
          <RequireEmployee>
            <EmployeeRecords />
          </RequireEmployee>
        }
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route path="/admin/records" element={<AdminRecords />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
