const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

export const api = {
  employeeLogin: (payload) =>
    request('/auth/employee', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  adminLogin: (payload) =>
    request('/auth/admin', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getTodayRecord: (userId) => request(`/employee/${userId}/today`),

  checkIn: (userId) =>
    request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),

  checkOut: (userId) =>
    request('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),

  getEmployeeRecords: (userId, year, month) =>
    request(`/employee/${userId}/records?year=${year}&month=${month}`),

  getAdminRecords: ({ query = '', date = '' }) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (date) params.set('date', date);
    const search = params.toString();
    return request(`/admin/records${search ? `?${search}` : ''}`);
  },

  getEmployees: () => request('/admin/employees'),

  createEmployee: (payload) =>
    request('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateEmployee: (id, payload) =>
    request(`/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteEmployee: (id) =>
    request(`/admin/employees/${id}`, {
      method: 'DELETE'
    }),

  getAdminSettings: () => request('/admin/settings'),

  updateAdminSettings: (payload) =>
    request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
};
