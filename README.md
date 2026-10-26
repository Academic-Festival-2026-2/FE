# 픽셀 Frontend

2026 컴퓨터공학과 학술제 프로젝트 **픽셀**의 프론트엔드입니다.
현재는 회원가입·로그인 기능이 구현되어 있습니다.

## 화면

| 경로 | 화면 | 설명 |
| --- | --- | --- |
| `/signup` | 회원가입 | 이메일, 비밀번호, 닉네임 입력 및 약관 동의 후 가입 |
| `/login` | 로그인 | 로그인 유지 선택 가능, 가입 직후에는 완료 안내 표시 |
| `/` | 홈 | 로그인 완료 안내와 로그아웃 (로그인하지 않으면 `/login`으로 이동) |
| 그 외 | 안내 | 없는 주소 안내 |

카카오 로그인, 이메일 인증, 비밀번호 찾기, 지도 둘러보기는 버튼만 있고 아직 준비 중입니다.

## 기술 스택

- React 19, TypeScript, Vite
- TanStack Router (파일 기반 라우팅)
- Tailwind CSS v4
- Zustand (로그인 토큰 상태)

## 실행 방법

### 준비물

- Node.js 20.19 이상 또는 22.12 이상 (Vite 요구 사항)
- pnpm
- [BE 서버](https://github.com/Academic-Festival-2026-2/BE) (회원가입·로그인 API)

### 실행

1. BE 서버를 먼저 `http://localhost:8080`에서 실행합니다.
2. 패키지를 설치하고 개발 서버를 실행합니다.

```bash
pnpm install
pnpm dev
```

3. 브라우저에서 `http://localhost:5173`에 접속합니다.

### 기타 명령어

```bash
pnpm build   # 배포용 빌드 (dist 폴더 생성)
pnpm lint    # 코드 검사
```

## BE 연결

- 개발 서버(`pnpm dev`)는 `/api`로 시작하는 요청을 `http://localhost:8080`으로 전달합니다. (`vite.config.ts`의 `server.proxy`)
- 배포할 때는 `.env.example`을 참고해 `.env`에 BE 주소를 넣습니다.

```bash
VITE_API_BASE_URL=https://api.example.com
```

## 폴더 구조

```
src/
├── api/          # BE API 호출 (공통 요청 함수, 인증 API)
├── components/   # 여러 화면에서 쓰는 UI (입력칸, 헤더, 레이아웃)
├── pages/        # 화면별 컴포넌트
├── routes/       # URL과 화면 연결 (TanStack Router)
├── stores/       # 전역 상태 (로그인 토큰)
└── utils/        # 공통 유틸리티
```

`src/routeTree.gen.ts`는 TanStack Router 플러그인이 자동으로 만드는 파일이므로 직접 수정하지 않습니다.
