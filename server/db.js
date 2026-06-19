// server/db.js
// Vercel 배포용 Supabase DB 연결 파일
// 기존 로컬 db.json(fs 기반) 저장 방식을 제거하고 Supabase에 데이터를 저장한다.

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Supabase 환경변수가 설정되지 않았습니다. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.'
  );
}

// service role key는 서버에서만 사용해야 한다.
// 절대 src/ 프론트엔드 코드에 넣으면 안 된다.
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: {
    transport: ws
  }
});

// Supabase snake_case → 기존 프로젝트 camelCase 형태로 변환
function mapUserFromDb(user) {
  return {
    id: user.id,
    name: user.name,
    studentId: user.student_id,
    role: user.role,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function mapRecordFromDb(record) {
  return {
    id: record.id,
    userId: record.user_id,
    date: record.date,
    checkInTime: record.check_in_time,
    checkOutTime: record.check_out_time,
    workDurationMinutes: record.work_duration_minutes,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapSettingsFromDb(settings) {
  return {
    adminId: settings.admin_id,
    adminPassword: settings.admin_password,
    adminName: settings.admin_name
  };
}

// 기존 ensureDb()와 호환용 함수
// Supabase에서는 테이블 생성은 SQL Editor에서 미리 해야 하므로 여기서는 초기 관리자 설정만 확인한다.
export async function ensureDb() {
  const { data: settings, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('id', 'main')
    .maybeSingle();

  if (error) {
    throw new Error(`관리자 설정 조회 실패: ${error.message}`);
  }

  if (!settings) {
    const { error: insertSettingsError } = await supabase
      .from('admin_settings')
      .insert({
        id: 'main',
        admin_id: 'admin',
        admin_password: 'admin1234',
        admin_name: '관리자'
      });

    if (insertSettingsError) {
      throw new Error(`관리자 설정 생성 실패: ${insertSettingsError.message}`);
    }
  }

  const { data: adminUser, error: adminUserError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'admin')
    .maybeSingle();

  if (adminUserError) {
    throw new Error(`관리자 계정 조회 실패: ${adminUserError.message}`);
  }

  if (!adminUser) {
    const { data: currentSettings } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 'main')
      .single();

    const { error: insertAdminError } = await supabase
      .from('users')
      .insert({
        name: currentSettings?.admin_name || '관리자',
        student_id: currentSettings?.admin_id || 'admin',
        role: 'admin'
      });

    if (insertAdminError) {
      throw new Error(`관리자 사용자 생성 실패: ${insertAdminError.message}`);
    }
  }
}

// 기존 readDb()와 최대한 비슷하게 동작하도록 만든 함수
// 기존 코드에서 const db = readDb(); 였다면 const db = await readDb(); 로 바꿔야 한다.
export async function readDb() {
  await ensureDb();

  const { data: settingsData, error: settingsError } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('id', 'main')
    .single();

  if (settingsError) {
    throw new Error(`관리자 설정 조회 실패: ${settingsError.message}`);
  }

  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });

  if (usersError) {
    throw new Error(`사용자 조회 실패: ${usersError.message}`);
  }

  const { data: recordsData, error: recordsError } = await supabase
    .from('attendance_records')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (recordsError) {
    throw new Error(`출퇴근 기록 조회 실패: ${recordsError.message}`);
  }

  return {
    settings: mapSettingsFromDb(settingsData),
    users: usersData.map(mapUserFromDb),
    attendanceRecords: recordsData.map(mapRecordFromDb)
  };
}

// 기존 writeDb()와 호환용 함수
// 단, Supabase에서는 전체 DB를 한 번에 덮어쓰기보다 개별 API에서 insert/update/delete 하는 방식이 더 좋다.
// 그래도 기존 server/index.js 구조를 최대한 유지하기 위해 제공한다.
export async function writeDb(db) {
  if (!db || typeof db !== 'object') {
    throw new Error('저장할 DB 데이터가 올바르지 않습니다.');
  }

  const now = new Date().toISOString();

  if (db.settings) {
    const { error: settingsError } = await supabase
      .from('admin_settings')
      .upsert({
        id: 'main',
        admin_id: db.settings.adminId || 'admin',
        admin_password: db.settings.adminPassword || 'admin1234',
        admin_name: db.settings.adminName || '관리자',
        updated_at: now
      });

    if (settingsError) {
      throw new Error(`관리자 설정 저장 실패: ${settingsError.message}`);
    }
  }

  if (Array.isArray(db.users)) {
    const usersPayload = db.users.map((user) => ({
      id: user.id,
      name: user.name,
      student_id: user.studentId,
      role: user.role || 'employee',
      created_at: user.createdAt || now,
      updated_at: now
    }));

    if (usersPayload.length > 0) {
      const { error: usersError } = await supabase
        .from('users')
        .upsert(usersPayload);

      if (usersError) {
        throw new Error(`사용자 저장 실패: ${usersError.message}`);
      }
    }
  }

  if (Array.isArray(db.attendanceRecords)) {
    const recordsPayload = db.attendanceRecords.map((record) => ({
      id: record.id,
      user_id: record.userId,
      date: record.date,
      check_in_time: record.checkInTime,
      check_out_time: record.checkOutTime || null,
      work_duration_minutes: record.workDurationMinutes || 0,
      status: record.status,
      created_at: record.createdAt || now,
      updated_at: now
    }));

    if (recordsPayload.length > 0) {
      const { error: recordsError } = await supabase
        .from('attendance_records')
        .upsert(recordsPayload);

      if (recordsError) {
        throw new Error(`출퇴근 기록 저장 실패: ${recordsError.message}`);
      }
    }
  }
}

// 개발 중 테스트 데이터를 초기화하고 싶을 때만 사용하는 함수
// 운영 중에는 절대 호출하지 않는 것을 권장한다.
export async function resetDbForDev() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('운영 환경에서는 DB 초기화를 실행할 수 없습니다.');
  }

  await supabase.from('attendance_records').delete().neq('id', '');
  await supabase.from('users').delete().neq('id', '');
  await supabase.from('admin_settings').delete().neq('id', '');

  await ensureDb();
}