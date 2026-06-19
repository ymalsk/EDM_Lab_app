import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

import { readDb, writeDb } from '../server/db.js';
import {
  getKstNow,
  getMonthRange,
  getWeekRange,
  minutesToText
} from '../server/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    studentId: user.studentId,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function sanitizeAdminSettings(settings) {
  if (!settings) return null;

  return {
    adminId: settings.adminId,
    adminName: settings.adminName
  };
}

function getStatusLabel(record) {
  if (!record) return '미완료';
  if (record.status === 'checked-out') return '퇴근 완료';
  if (record.status === 'checked-in') return '미퇴근';
  return '미완료';
}

function validateEmployeeInput({ name, studentId }) {
  if (!name || !studentId) return '이름과 학번을 모두 입력해주세요.';
  if (String(studentId).toLowerCase() === 'admin') {
    return 'admin은 직원 학번으로 사용할 수 없습니다.';
  }
  return '';
}

function handleServerError(res, error, label = '요청 처리') {
  console.error(`${label} 오류:`, error);

  return res.status(500).json({
    ok: false,
    message: `${label} 중 오류가 발생했습니다.`,
    detail: error.message
  });
}

function parseYmd(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return { year, month, day };
}

function formatKstDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function createKstDateTime(dateString, hour = 0, minute = 0, second = 0, millisecond = 0) {
  const { year, month, day } = parseYmd(dateString);

  // KST는 UTC+9이므로 UTC 기준으로 9시간을 뺀 Date를 만든다.
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, second, millisecond));
}

function getKstStartOfDay(dateString) {
  return createKstDateTime(dateString, 0, 0, 0, 0);
}

function getKstEndOfDay(dateString) {
  return createKstDateTime(dateString, 23, 59, 59, 0);
}

function addDaysToYmd(dateString, days) {
  const base = getKstStartOfDay(dateString);
  base.setUTCDate(base.getUTCDate() + days);
  return formatKstDate(base);
}

function calculateDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();

  return Math.max(0, Math.floor(diffMs / 1000 / 60));
}

function getNextSessionOrder(records, userId, date) {
  const sessionOrders = records
    .filter((record) => record.userId === userId && record.date === date)
    .map((record) => Number(record.sessionOrder || 1));

  if (sessionOrders.length === 0) return 1;

  return Math.max(...sessionOrders) + 1;
}

function getOpenRecord(records, userId) {
  return records
    .filter((record) => record.userId === userId)
    .filter((record) => record.status === 'checked-in' && !record.checkOutTime)
    .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())[0] || null;
}

function getDateRecords(records, userId, date) {
  return records
    .filter((record) => record.userId === userId && record.date === date)
    .sort((a, b) => {
      const orderA = Number(a.sessionOrder || 1);
      const orderB = Number(b.sessionOrder || 1);

      if (orderA !== orderB) return orderA - orderB;

      return new Date(a.checkInTime || 0).getTime() - new Date(b.checkInTime || 0).getTime();
    });
}

function getDailyStatusLabel(records) {
  if (!records.length) return '';

  if (records.some((record) => record.status === 'incomplete')) {
    return '미완료';
  }

  if (records.some((record) => record.status === 'checked-in' || !record.checkOutTime)) {
    return '미퇴근';
  }

  if (records.every((record) => record.status === 'checked-out')) {
    return '퇴근 완료';
  }

  return '미완료';
}

function getDailyTotalMinutes(records) {
  return records.reduce((sum, record) => {
    return sum + (record.workDurationMinutes || 0);
  }, 0);
}

function calculateWeeklyMinutes(records, userId, date) {
  const { start, end } = getWeekRange(date);

  return records
    .filter((record) => record.userId === userId)
    .filter((record) => record.date >= start && record.date <= end)
    .reduce((sum, record) => sum + (record.workDurationMinutes || 0), 0);
}

function enrichRecord(record, user, allRecords) {
  const weeklyMinutes = calculateWeeklyMinutes(allRecords, record.userId, record.date);
  const sessionOrder = Number(record.sessionOrder || 1);

  return {
    ...record,
    sessionOrder,
    sessionLabel: `${sessionOrder}차`,
    employeeName: user?.name || '알 수 없음',
    studentId: user?.studentId || '-',
    statusLabel: getStatusLabel(record),
    workDurationText: minutesToText(record.workDurationMinutes || 0),
    weeklyWorkDurationMinutes: weeklyMinutes,
    weeklyWorkDurationText: minutesToText(weeklyMinutes)
  };
}

function buildDailySummary(records, userId, date) {
  const dateRecords = getDateRecords(records, userId, date);
  const totalMinutes = getDailyTotalMinutes(dateRecords);

  return {
    date,
    recordCount: dateRecords.length,
    totalMinutes,
    totalText: minutesToText(totalMinutes),
    statusLabel: getDailyStatusLabel(dateRecords),
    records: dateRecords
  };
}

// 자정을 넘긴 미퇴근 기록을 날짜별로 자동 분리한다.
// 예: 6/19 22:00 출근 상태에서 6/20에 접근하면
// 6/19 22:00~23:59:59 퇴근 완료 + 6/20 00:00 미퇴근 기록으로 분리한다.
function normalizeOpenRecordsForUser(db, userId, targetDate) {
  let changed = false;
  let guard = 0;

  while (guard < 370) {
    guard += 1;

    const openRecord = db.attendanceRecords
      .filter((record) => record.userId === userId)
      .filter((record) => record.status === 'checked-in' && !record.checkOutTime)
      .filter((record) => record.date < targetDate)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];

    if (!openRecord) break;

    const nextDate = addDaysToYmd(openRecord.date, 1);
    const endOfDay = getKstEndOfDay(openRecord.date);
    const startOfNextDay = getKstStartOfDay(nextDate);

    openRecord.checkOutTime = endOfDay.toISOString();
    openRecord.workDurationMinutes = calculateDurationMinutes(
      openRecord.checkInTime,
      openRecord.checkOutTime
    );
    openRecord.status = 'checked-out';
    openRecord.updatedAt = new Date().toISOString();

    const nextRecord = {
      id: randomUUID(),
      userId,
      date: nextDate,
      sessionOrder: getNextSessionOrder(db.attendanceRecords, userId, nextDate),
      checkInTime: startOfNextDay.toISOString(),
      checkOutTime: null,
      workDurationMinutes: 0,
      status: 'checked-in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.attendanceRecords.push(nextRecord);
    changed = true;
  }

  if (guard >= 370) {
    throw new Error('자정 초과 근무 자동 분리 처리 중 반복 제한을 초과했습니다.');
  }

  return changed;
}

function normalizeOpenRecordsForAllUsers(db, targetDate) {
  let changed = false;

  const employeeIds = db.users
    .filter((user) => user.role === 'employee')
    .map((user) => user.id);

  employeeIds.forEach((userId) => {
    const userChanged = normalizeOpenRecordsForUser(db, userId, targetDate);
    if (userChanged) changed = true;
  });

  return changed;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'attendance server is running'
  });
});

// 직원 로그인: 관리자가 등록한 직원만 로그인할 수 있다.
app.post('/api/auth/employee', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const studentId = String(req.body.studentId || '').trim();

    if (!name || !studentId) {
      return res.status(400).json({
        message: '이름과 학번을 모두 입력해주세요.'
      });
    }

    const db = await readDb();

    const user = db.users.find(
      (item) => item.studentId === studentId && item.role === 'employee'
    );

    if (!user) {
      return res.status(401).json({
        message: '등록된 직원만 로그인할 수 있습니다. 관리자에게 직원 등록을 요청해주세요.'
      });
    }

    if (user.name !== name) {
      return res.status(401).json({
        message: '이름 또는 학번이 등록 정보와 일치하지 않습니다.'
      });
    }

    return res.json({
      user: sanitizeUser(user)
    });
  } catch (error) {
    return handleServerError(res, error, '직원 로그인');
  }
});

// 관리자 로그인
app.post('/api/auth/admin', async (req, res) => {
  try {
    const adminId = String(req.body.adminId || '').trim();
    const password = String(req.body.password || '').trim();

    const db = await readDb();

    if (!db.settings) {
      return res.status(500).json({
        ok: false,
        message: '관리자 설정 정보를 불러오지 못했습니다.'
      });
    }

    if (
      adminId === db.settings.adminId &&
      password === db.settings.adminPassword
    ) {
      return res.json({
        ok: true,
        admin: {
          id: 'admin-user',
          name: db.settings.adminName,
          role: 'admin'
        }
      });
    }

    return res.status(401).json({
      ok: false,
      message: '관리자 ID 또는 비밀번호가 올바르지 않습니다.'
    });
  } catch (error) {
    return handleServerError(res, error, '관리자 로그인');
  }
});

// 직원 오늘 기록 조회
app.get('/api/employee/:userId/today', async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = getKstNow();

    const db = await readDb();

    const user = db.users.find(
      (item) => item.id === userId && item.role === 'employee'
    );

    if (!user) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.'
      });
    }

    const changed = normalizeOpenRecordsForUser(db, userId, date);
    if (changed) await writeDb(db);

    const todayRecords = getDateRecords(db.attendanceRecords, userId, date);
    const enrichedRecords = todayRecords.map((record) =>
      enrichRecord(record, user, db.attendanceRecords)
    );

    const currentOpenRecord = getOpenRecord(db.attendanceRecords, userId);
    const dailyWorkDurationMinutes = getDailyTotalMinutes(todayRecords);

    return res.json({
      today: date,
      records: enrichedRecords,
      record: enrichedRecords[enrichedRecords.length - 1] || null,
      currentOpenRecord: currentOpenRecord
        ? enrichRecord(currentOpenRecord, user, db.attendanceRecords)
        : null,
      dailyWorkDurationMinutes,
      dailyWorkDurationText: minutesToText(dailyWorkDurationMinutes),
      statusLabel: getDailyStatusLabel(todayRecords)
    });
  } catch (error) {
    return handleServerError(res, error, '오늘 기록 조회');
  }
});

// 출근 처리: 현재 미퇴근 기록이 없으면 언제든 재출근 가능
app.post('/api/attendance/check-in', async (req, res) => {
  try {
    const { userId } = req.body;
    const { now, date } = getKstNow();

    const db = await readDb();

    const user = db.users.find(
      (item) => item.id === userId && item.role === 'employee'
    );

    if (!user) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.'
      });
    }

    const changed = normalizeOpenRecordsForUser(db, userId, date);
    if (changed) await writeDb(db);

    const openRecord = getOpenRecord(db.attendanceRecords, userId);

    if (openRecord) {
      return res.status(409).json({
        message: '이미 출근 상태입니다. 먼저 퇴근 처리해주세요.',
        record: enrichRecord(openRecord, user, db.attendanceRecords)
      });
    }

    const record = {
      id: randomUUID(),
      userId,
      date,
      sessionOrder: getNextSessionOrder(db.attendanceRecords, userId, date),
      checkInTime: now.toISOString(),
      checkOutTime: null,
      workDurationMinutes: 0,
      status: 'checked-in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.attendanceRecords.push(record);

    await writeDb(db);

    return res.json({
      message: '출근 처리되었습니다.',
      record: enrichRecord(record, user, db.attendanceRecords)
    });
  } catch (error) {
    return handleServerError(res, error, '출근 처리');
  }
});

// 퇴근 처리: 가장 최근 미퇴근 기록을 퇴근 처리
app.post('/api/attendance/check-out', async (req, res) => {
  try {
    const { userId } = req.body;
    const { now, date } = getKstNow();

    const db = await readDb();

    const user = db.users.find(
      (item) => item.id === userId && item.role === 'employee'
    );

    if (!user) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.'
      });
    }

    const changed = normalizeOpenRecordsForUser(db, userId, date);

    let record = getOpenRecord(db.attendanceRecords, userId);

    if (!record) {
      if (changed) await writeDb(db);

      return res.status(404).json({
        message: '현재 출근 상태가 아닙니다.'
      });
    }

    if (!record.checkInTime) {
      record.status = 'incomplete';
      record.updatedAt = new Date().toISOString();

      await writeDb(db);

      return res.status(400).json({
        message: '출근 시간이 비정상적입니다.',
        record: enrichRecord(record, user, db.attendanceRecords)
      });
    }

    record.checkOutTime = now.toISOString();
    record.workDurationMinutes = calculateDurationMinutes(
      record.checkInTime,
      record.checkOutTime
    );
    record.status = 'checked-out';
    record.updatedAt = new Date().toISOString();

    await writeDb(db);

    return res.json({
      message: '퇴근 처리되었습니다.',
      record: enrichRecord(record, user, db.attendanceRecords)
    });
  } catch (error) {
    return handleServerError(res, error, '퇴근 처리');
  }
});

// 직원 월간 기록 조회
app.get('/api/employee/:userId/records', async (req, res) => {
  try {
    const { userId } = req.params;
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    const { date: today } = getKstNow();

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        message: 'year와 month 값을 올바르게 입력해주세요.'
      });
    }

    const db = await readDb();

    const user = db.users.find(
      (item) => item.id === userId && item.role === 'employee'
    );

    if (!user) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.'
      });
    }

    const changed = normalizeOpenRecordsForUser(db, userId, today);
    if (changed) await writeDb(db);

    const { start, end } = getMonthRange(year, month);

    const records = db.attendanceRecords
      .filter(
        (record) =>
          record.userId === userId &&
          record.date >= start &&
          record.date <= end
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);

        const orderA = Number(a.sessionOrder || 1);
        const orderB = Number(b.sessionOrder || 1);

        if (orderA !== orderB) return orderA - orderB;

        return new Date(a.checkInTime || 0).getTime() - new Date(b.checkInTime || 0).getTime();
      })
      .map((record) => enrichRecord(record, user, db.attendanceRecords));

    const monthlyWorkDurationMinutes = records.reduce(
      (sum, record) => sum + (record.workDurationMinutes || 0),
      0
    );

    const dailySummaryMap = new Map();

    records.forEach((record) => {
      if (!dailySummaryMap.has(record.date)) {
        const rawDateRecords = getDateRecords(db.attendanceRecords, userId, record.date);

        dailySummaryMap.set(record.date, {
          date: record.date,
          recordCount: rawDateRecords.length,
          totalMinutes: getDailyTotalMinutes(rawDateRecords),
          totalText: minutesToText(getDailyTotalMinutes(rawDateRecords)),
          statusLabel: getDailyStatusLabel(rawDateRecords)
        });
      }
    });

    const dailySummaries = Array.from(dailySummaryMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      year,
      month,
      employee: sanitizeUser(user),
      records,
      dailySummaries,
      monthlyWorkDurationMinutes,
      monthlyWorkDurationText: minutesToText(monthlyWorkDurationMinutes)
    });
  } catch (error) {
    return handleServerError(res, error, '직원 월간 기록 조회');
  }
});

// 관리자 전체 기록 조회
app.get('/api/admin/records', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim().toLowerCase();
    const filterDate = String(req.query.date || '').trim();
    const { date: today } = getKstNow();

    const db = await readDb();

    const changed = normalizeOpenRecordsForAllUsers(db, today);
    if (changed) await writeDb(db);

    const employeeUsers = db.users.filter((user) => user.role === 'employee');
    const usersById = new Map(employeeUsers.map((user) => [user.id, user]));

    let records = db.attendanceRecords
      .filter((record) => usersById.has(record.userId))
      .map((record) =>
        enrichRecord(record, usersById.get(record.userId), db.attendanceRecords)
      );

    if (query) {
      records = records.filter((record) => {
        const name = record.employeeName.toLowerCase();
        const studentId = record.studentId.toLowerCase();
        return name.includes(query) || studentId.includes(query);
      });
    }

    if (filterDate) {
      records = records.filter((record) => record.date === filterDate);
    }

    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);

      const nameCompare = a.employeeName.localeCompare(b.employeeName, 'ko-KR');
      if (nameCompare !== 0) return nameCompare;

      const checkInCompare =
        new Date(a.checkInTime || 0).getTime() - new Date(b.checkInTime || 0).getTime();

      if (checkInCompare !== 0) return checkInCompare;

      return Number(a.sessionOrder || 1) - Number(b.sessionOrder || 1);
    });

    return res.json({
      records
    });
  } catch (error) {
    return handleServerError(res, error, '관리자 기록 조회');
  }
});

// 관리자 직원 목록 조회
app.get('/api/admin/employees', async (req, res) => {
  try {
    const db = await readDb();

    const employees = db.users
      .filter((user) => user.role === 'employee')
      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
      .map((user) => sanitizeUser(user));

    return res.json({
      employees
    });
  } catch (error) {
    return handleServerError(res, error, '직원 목록 조회');
  }
});

// 관리자 직원 등록
app.post('/api/admin/employees', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const studentId = String(req.body.studentId || '').trim();

    const inputError = validateEmployeeInput({
      name,
      studentId
    });

    if (inputError) {
      return res.status(400).json({
        message: inputError
      });
    }

    const db = await readDb();

    const exists = db.users.find((user) => user.studentId === studentId);

    if (exists) {
      return res.status(409).json({
        message: '이미 등록된 학번입니다.'
      });
    }

    const employee = {
      id: randomUUID(),
      name,
      studentId,
      role: 'employee',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.users.push(employee);

    await writeDb(db);

    return res.status(201).json({
      message: '직원이 등록되었습니다.',
      employee: sanitizeUser(employee)
    });
  } catch (error) {
    return handleServerError(res, error, '직원 등록');
  }
});

// 관리자 직원 정보 수정
app.put('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body.name || '').trim();
    const studentId = String(req.body.studentId || '').trim();

    const inputError = validateEmployeeInput({
      name,
      studentId
    });

    if (inputError) {
      return res.status(400).json({
        message: inputError
      });
    }

    const db = await readDb();

    const employee = db.users.find(
      (user) => user.id === id && user.role === 'employee'
    );

    if (!employee) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.'
      });
    }

    const duplicate = db.users.find(
      (user) => user.studentId === studentId && user.id !== id
    );

    if (duplicate) {
      return res.status(409).json({
        message: '이미 등록된 학번입니다.'
      });
    }

    employee.name = name;
    employee.studentId = studentId;
    employee.updatedAt = new Date().toISOString();

    await writeDb(db);

    return res.json({
      message: '직원 정보가 수정되었습니다.',
      employee: sanitizeUser(employee)
    });
  } catch (error) {
    return handleServerError(res, error, '직원 정보 수정');
  }
});

// 관리자 직원 삭제
app.delete('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const db = await readDb();

    const employee = db.users.find(
      (user) => user.id === id && user.role === 'employee'
    );

    if (!employee) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.'
      });
    }

    db.users = db.users.filter((user) => user.id !== id);
    db.attendanceRecords = db.attendanceRecords.filter(
      (record) => record.userId !== id
    );

    await writeDb(db);

    return res.json({
      message: '직원과 해당 직원의 출퇴근 기록이 삭제되었습니다.'
    });
  } catch (error) {
    return handleServerError(res, error, '직원 삭제');
  }
});

// 관리자 계정 설정 조회
app.get('/api/admin/settings', async (req, res) => {
  try {
    const db = await readDb();

    return res.json({
      settings: sanitizeAdminSettings(db.settings)
    });
  } catch (error) {
    return handleServerError(res, error, '관리자 설정 조회');
  }
});

// 관리자 계정 설정 수정
app.put('/api/admin/settings', async (req, res) => {
  try {
    const adminId = String(req.body.adminId || '').trim();
    const currentPassword = String(req.body.currentPassword || '').trim();
    const newPassword = String(req.body.newPassword || '').trim();

    if (!adminId) {
      return res.status(400).json({
        message: '새 관리자 ID를 입력해주세요.'
      });
    }

    const db = await readDb();

    if (!db.settings) {
      return res.status(500).json({
        message: '관리자 설정 정보를 불러오지 못했습니다.'
      });
    }

    if (currentPassword !== db.settings.adminPassword) {
      return res.status(401).json({
        message: '현재 관리자 비밀번호가 올바르지 않습니다.'
      });
    }

    const duplicateEmployee = db.users.find(
      (user) => user.role === 'employee' && user.studentId === adminId
    );

    if (duplicateEmployee) {
      return res.status(409).json({
        message: '직원 학번으로 사용 중인 값은 관리자 ID로 사용할 수 없습니다.'
      });
    }

    db.settings.adminId = adminId;

    if (newPassword) {
      db.settings.adminPassword = newPassword;
    }

    const admin = db.users.find((user) => user.role === 'admin');

    if (admin) {
      admin.name = db.settings.adminName;
      admin.studentId = adminId;
      admin.updatedAt = new Date().toISOString();
    }

    await writeDb(db);

    return res.json({
      message: '관리자 계정 설정이 수정되었습니다. 다음 로그인부터 변경된 정보가 적용됩니다.',
      settings: sanitizeAdminSettings(db.settings),
      admin: sanitizeUser(admin)
    });
  } catch (error) {
    return handleServerError(res, error, '관리자 계정 설정 수정');
  }
});

// Vercel에서는 정적 파일 서빙은 Vite/Vercel이 담당한다.
// 로컬 production 실행 호환용으로만 남긴다.
const distPath = path.join(__dirname, '..', 'dist');

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();

  res.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error) {
      res.status(404).send(
        '먼저 npm run build를 실행하거나 개발 모드에서는 http://localhost:5173 으로 접속해주세요.'
      );
    }
  });
});

// Vercel 배포용: app.listen() 사용 금지
export default app;