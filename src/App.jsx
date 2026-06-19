import { Navigate, Route, Routes } from 'react-router-dom';
import EmployeeLogin from './pages/EmployeeLogin.jsx';
import EmployeeHome from './pages/EmployeeHome.jsx';
import EmployeeRecords from './pages/EmployeeRecords.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRecords from './pages/AdminRecords.jsx';

function RequireEmployee({ children }) {
  const employee = localStorage.getItem('currentEmployee');
  return employee ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const admin = localStorage.getItem('currentAdmin');
  return admin ? children : <Navigate to="/admin/login" replace />;
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
