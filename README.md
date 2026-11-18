# Pixel (픽셀) — Frontend

> **사진의 색으로 그리는 동네 여행 지도**
> 2026 컴퓨터정보공학부 학술제 CLUEDAY · 팀 CS24

사진에 담긴 색·촬영 시각·위치를 행정동 단위로 모아, 동네마다 "언제 가면 어떤 색을 볼 수 있는지"를 지도에 칠해 보여 주는 반응형 웹입니다.

- **서비스:** https://pixel-rouge-delta.vercel.app
- **백엔드 레포지토리:** https://github.com/Academic-Festival-2026-2/BE (API 목록, 배포 아키텍처 포함)
- **데이터 범위:** 경기도 31개 시·군 행정동 × 4계절 × 4시간대(새벽·낮·노을·밤)

## 주요 기능

- **공유 지도:** 모두의 사진으로 칠한 동 색을 시간대·계절별로 보기
- **동 상세:** 시간대별 대표색·색 비율, 사진 지점과 사진 크게 보기
- **사진 업로드:** 브라우저에서 EXIF를 읽고 사진 색을 팔레트 40색으로 분석해 대표색 후보 3개 제안
- **나의 지도:** 내 사진으로 칠한 지도, 공유 링크
- **마이페이지:** 내 사진·좋아요·배지, 정보 수정, 회원 탈퇴
- **회원:** 이메일 회원가입·로그인, 토큰 자동 재발급

## 화면

| 경로 | 화면 | 로그인 |
|---|---|---|
| `/` | 첫 화면 이동 (로그인했으면 지도, 아니면 로그인) | - |
| `/login` | 로그인 | X |
| `/signup` | 회원가입 (약관 동의) | X |
| `/map` | 공유 지도 · 나의 지도 (`?timeBand=&season=&mode=mine&region=`) | X (나의 지도는 O) |
| `/dong/{dongCode}` | 동 상세 | X |
| `/upload` | 사진 업로드 | O |
| `/mypage` | 마이페이지 | O |
| `/mypage/photos` | 내 사진 모아보기 | O |
| `/mypage/likes` | 좋아요한 사진 | O |
| `/shared/{shareKey}` | 공유된 나의 지도 | X |
| 그 외 | 없는 주소 안내 | - |

## 아키텍처

배포 구조 그림은 [BE README](https://github.com/Academic-Festival-2026-2/BE#아키텍처)에 있습니다.

- Vercel이 정적 파일을 배포하고, `vercel.json`이 `/api/*` 요청을 백엔드(EC2)로 전달합니다. 그 밖의 경로는 `index.html`로 보내 SPA 라우팅을 씁니다.
- 브라우저는 같은 도메인의 `/api`만 부르므로 CORS 설정이 필요 없습니다.
- 사진 파일은 백엔드가 주는 5분짜리 S3 서명 URL로 직접 받습니다.
- 지도는 카카오맵 JS SDK 위에 동 경계를 SVG로 겹쳐 그립니다.

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| Language | TypeScript |
| Framework | React 19, Vite |
| 라우팅 | TanStack Router (파일 기반, 자동 코드 분할) |
| 상태 | Zustand (로그인 토큰, 내 정보) |
| 스타일 | Tailwind CSS v4 (디자인 토큰은 `src/index.css`의 `@theme`) |
| 지도 | 카카오맵 JS SDK + SVG |
| 사진 | exifr (EXIF 읽기), Canvas (색 분석) |
| 코드 품질 | ESLint, Prettier, Node 내장 테스트 러너 |
| 배포 · CI | Vercel (PR 미리보기 배포), GitHub Actions (lint · build, dev 머지 필수 체크) |

## 실행 방법

### 준비물

- Node.js 20.19 이상 또는 22.12 이상
- pnpm
- [BE 서버](https://github.com/Academic-Festival-2026-2/BE#실행-방법) (`http://localhost:8080`)
- 카카오 개발자 JavaScript 키 (`localhost:5173` 도메인 등록)

### 환경 변수

`.env.example`을 복사해 `.env.local`을 만듭니다.

| 변수 | 설명 |
|---|---|
| `VITE_KAKAO_MAP_KEY` | 카카오맵 JavaScript 키 |
| `VITE_API_BASE_URL` | **비워 둡니다.** 개발은 Vite 프록시, 배포는 Vercel 리라이트가 `/api`를 백엔드로 전달합니다. 값을 넣으면 브라우저가 백엔드를 직접 불러 CORS·mixed content로 막힙니다. |

### 실행

```bash
pnpm install
pnpm dev
```

브라우저에서 http://localhost:5173 에 접속합니다. `/api`로 시작하는 요청은 `http://localhost:8080`으로 전달됩니다(`vite.config.ts`의 `server.proxy`).

### 기타 명령어

```bash
pnpm build    # 배포용 빌드 (vite build + 타입 검사)
pnpm lint     # ESLint
pnpm test     # 단위 테스트 (tests/*.mjs)
pnpm format   # Prettier 정리
```

## 폴더 구조

```
src/
├── routes/       # URL과 화면 연결 (TanStack Router, 파일 이름 = 경로)
├── pages/        # 화면 하나에서만 쓰는 컴포넌트
│   ├── map/  dong/  shared/  photo-upload/  mypage/
│   └── login/  signup/  not-found/
├── features/     # 여러 화면이 함께 쓰는 기능 단위
│   ├── map/      # 지도 데이터 훅, 경계·색 계산, SVG 지도, 지도 UI
│   └── photo/    # 사진 색 분석, 사진 상세·크게 보기
├── components/   # 공용 UI (레이아웃·헤더, 입력칸, 팝업, 아이콘)
├── hooks/        # 공용 훅 (로그아웃, 바깥 클릭 닫기, 미디어 쿼리 등)
├── api/          # BE API 호출 (공통 요청 함수 client.ts, 도메인별 파일)
├── stores/       # 전역 상태 (로그인 토큰, 내 정보)
├── constants/    # 약관 문구, 배지, 사진 출처
└── utils/        # 시간대·계절·날짜·검증 등 공통 함수
tests/            # 단위 테스트 (색 분석, 지도 계산, 업로드, 사진 상세 등)
```

- 가져오는 방향은 `routes → pages → features → components · hooks · utils · api · stores`로만 둡니다. 화면 폴더끼리는 서로 가져오지 않습니다.
- `src/routeTree.gen.ts`는 TanStack Router 플러그인이 자동으로 만드는 파일이라 직접 고치지 않습니다.

## 배포

- `main`에 머지되면 Vercel이 자동으로 빌드·배포합니다. PR마다 미리보기 주소가 붙습니다.
- Vercel 환경 변수에는 `VITE_KAKAO_MAP_KEY`만 넣습니다. `VITE_` 값은 빌드할 때 파일에 들어가므로, 바꾼 뒤에는 **Redeploy**가 필요합니다.
- 백엔드 주소가 바뀌면 `vercel.json`의 `destination`을 고칩니다.

## 협업 규칙

- 브랜치: `{타입}/{이슈번호}-{내용}` → **dev로 PR**, 리뷰 2명 승인 + CI 통과 후 머지. main은 dev → main 릴리스 PR로만 반영
- 커밋: `[타입] 내용 #이슈번호` (예: `[feat] 지도 화면 구현 #12`)
- 자세한 내용은 [CONTRIBUTING.md](.github/CONTRIBUTING.md)

## 팀원

| 이름 | 역할 |
|---|---|
| 서재민 | 팀장 / Architect |
| 권도현 | Dev |
| 김세훈 | Dev |
| 김우용 | Dev |
| 임현진 | Design |
