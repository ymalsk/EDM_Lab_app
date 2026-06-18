# 출근관리 웹사이트

React + Express + 로컬 JSON DB 기반 출근관리 웹사이트입니다.

## 주요 기능

- 직원은 관리자가 등록한 이름과 학번으로만 로그인 가능
- 직원 출근 / 퇴근 기록 저장
- 직원 월별 캘린더에서 일별, 주간, 월간 근로시간 확인
- 관리자는 전체 직원 출퇴근 기록 조회
- 관리자는 직원 등록 / 수정 / 삭제 가능
- 관리자는 관리자 ID / 비밀번호 변경 가능

## 실행 방법

```bash
npm install
npm run dev
```

- 직원 로그인: http://localhost:5173/login
- 관리자 로그인: http://localhost:5173/admin/login
- 최초 관리자 기본 계정: `admin` / `admin1234`

## 사용 순서

1. `/admin/login`에서 최초 관리자 계정으로 로그인합니다.
2. 관리자 페이지의 `직원 등록 / 수정 / 삭제` 영역에서 직원을 먼저 등록합니다.
3. 직원은 `/login`에서 관리자가 등록한 이름과 학번으로 로그인합니다.
4. 직원이 출근/퇴근을 기록하면 관리자 페이지의 출퇴근 기록 테이블에 표시됩니다.
5. 관리자 ID 또는 비밀번호는 관리자 페이지의 `관리자 계정 설정` 영역에서 변경합니다.

## 데이터 저장 구조

서버 실행 시 `server/db.json` 파일이 자동 생성됩니다.

```json
{
  "settings": {
    "adminId": "admin",
    "adminPassword": "admin1234",
    "adminName": "관리자"
  },
  "users": [
    {
      "id": "admin-user",
      "name": "관리자",
      "studentId": "admin",
      "role": "admin",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "attendanceRecords": []
}
```

## 배포용 실행

```bash
npm run build
npm start
```

빌드 후 http://localhost:4000 에서 접속할 수 있습니다.
