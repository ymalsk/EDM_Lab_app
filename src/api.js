const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.detail || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

export const api = {
  employeeLogin(payload) {
    return request('/auth/employee', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  adminLogin(payload) {
    return request('/auth/admin', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getTodayRecord(userId) {
    return request(`/employee/${userId}/today`);
  },

  checkIn(userId) {
    return request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  checkOut(userId) {
    return request('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  getEmployeeRecords(userId, year, month) {
    return request(`/employee/${userId}/records?year=${year}&month=${month}`);
  },

  getAdminRecords({ query = '', date = '' } = {}) {
    const params = new URLSearchParams();

    if (query) params.set('query', query);
    if (date) params.set('date', date);

    const queryString = params.toString();

    return request(`/admin/records${queryString ? `?${queryString}` : ''}`);
  },

  getAdminTodaySummary() {
    return request('/admin/today-summary');
  },

  getAdminEmployees() {
    return request('/admin/employees');
  },

  createEmployee(payload) {
    return request('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateEmployee(employeeId, payload) {
    return request(`/admin/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  deleteEmployee(employeeId) {
    return request(`/admin/employees/${employeeId}`, {
      method: 'DELETE'
    });
  },

  getAdminSettings() {
    return request('/admin/settings');
  },

  updateAdminSettings(payload) {
    return request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }
};