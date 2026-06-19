// server/db.js
// Vercel 배포용 Supabase DB 연결 파일
// Supabase에 직원, 출퇴근 기록, 관리자 설정을 저장한다.

import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Supabase 환경변수가 설정되지 않았습니다. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.'
  );
}

// service role key는 서버에서만 사용한다.
// 절대 src/ 프론트엔드 코드에 넣지 않는다.
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
    sessionOrder: record.session_order || 1,
    checkInTime: record.check_in_time,
    checkOutTime: record.check_out_time,
    workDurationMinutes: record.work_duration_minutes || 0,
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

// Supabase 테이블은 SQL Editor에서 미리 생성해야 한다.
// 여기서는 초기 관리자 설정과 관리자 유저가 있는지만 확인한다.
export async function ensureDb() {
  const { data: settings, error: settingsError } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('id', 'main')
    .maybeSingle();

  if (settingsError) {
    throw new Error(`관리자 설정 조회 실패: ${settingsError.message}`);
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
    const { data: currentSettings, error: currentSettingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 'main')
      .single();

    if (currentSettingsError) {
      throw new Error(`현재 관리자 설정 조회 실패: ${currentSettingsError.message}`);
    }

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

// 기존 코드와 호환되도록 전체 DB 객체 형태로 반환한다.
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
    .order('session_order', { ascending: true })
    .order('check_in_time', { ascending: true });

  if (recordsError) {
    throw new Error(`출퇴근 기록 조회 실패: ${recordsError.message}`);
  }

  return {
    settings: mapSettingsFromDb(settingsData),
    users: usersData.map(mapUserFromDb),
    attendanceRecords: recordsData.map(mapRecordFromDb)
  };
}

// 기존 index.js 구조와 호환되도록 전체 DB 객체를 저장한다.
// Supabase에서는 upsert 후, 배열에서 빠진 기존 데이터는 삭제되도록 보정한다.
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
      updated_at: user.updatedAt || now
    }));

    if (usersPayload.length > 0) {
      const { error: usersError } = await supabase
        .from('users')
        .upsert(usersPayload);

      if (usersError) {
        throw new Error(`사용자 저장 실패: ${usersError.message}`);
      }

      // db.users에서 제거된 사용자는 Supabase에서도 제거한다.
      // 직원 삭제 기능이 실제 DB에 반영되도록 하기 위한 처리다.
      const keepUserIds = usersPayload.map((user) => user.id);

      const { error: deleteUsersError } = await supabase
        .from('users')
        .delete()
        .not('id', 'in', `(${keepUserIds.join(',')})`);

      if (deleteUsersError) {
        throw new Error(`삭제된 사용자 반영 실패: ${deleteUsersError.message}`);
      }
    }
  }

  if (Array.isArray(db.attendanceRecords)) {
    const recordsPayload = db.attendanceRecords.map((record) => ({
      id: record.id,
      user_id: record.userId,
      date: record.date,
      session_order: record.sessionOrder || record.session_order || 1,
      check_in_time: record.checkInTime,
      check_out_time: record.checkOutTime || null,
      work_duration_minutes: record.workDurationMinutes || 0,
      status: record.status,
      created_at: record.createdAt || now,
      updated_at: record.updatedAt || now
    }));

    if (recordsPayload.length > 0) {
      const { error: recordsError } = await supabase
        .from('attendance_records')
        .upsert(recordsPayload);

      if (recordsError) {
        throw new Error(`출퇴근 기록 저장 실패: ${recordsError.message}`);
      }

      // db.attendanceRecords에서 제거된 기록은 Supabase에서도 제거한다.
      // 직원 삭제 시 해당 직원의 기록이 함께 삭제되도록 하기 위한 처리다.
      const keepRecordIds = recordsPayload.map((record) => record.id);

      const { error: deleteRecordsError } = await supabase
        .from('attendance_records')
        .delete()
        .not('id', 'in', `(${keepRecordIds.join(',')})`);

      if (deleteRecordsError) {
        throw new Error(`삭제된 출퇴근 기록 반영 실패: ${deleteRecordsError.message}`);
      }
    } else {
      // 기록 배열이 비어 있으면 전체 출퇴근 기록을 삭제한다.
      const { error: deleteAllRecordsError } = await supabase
        .from('attendance_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteAllRecordsError) {
        throw new Error(`전체 출퇴근 기록 삭제 실패: ${deleteAllRecordsError.message}`);
      }
    }
  }
}

// 개발 중 테스트 데이터를 초기화하고 싶을 때만 사용한다.
// 운영 환경에서는 실행되지 않도록 막는다.
export async function resetDbForDev() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('운영 환경에서는 DB 초기화를 실행할 수 없습니다.');
  }

  await supabase
    .from('attendance_records')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  await supabase
    .from('users')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  await supabase
    .from('admin_settings')
    .delete()
    .neq('id', 'main-delete-blocker');

  await ensureDb();
}