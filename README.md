# Academic Festival Frontend

React + TypeScript + Vite 기반의 학술제 프론트엔드 시작점입니다.

## Architecture

`umcine`의 구조적 장점인 파일 기반 라우팅과 관심사별 폴더를 가져왔습니다.

- `src/routes`: URL과 페이지 연결만 담당하는 TanStack Router route module
- `src/pages`: 라우트에서 사용하는 화면 조합과 사용자 흐름
- `src/components`: 여러 페이지에서 재사용하는 UI
- `src/data`: 개발 초기 샘플 데이터, 이후 API client 응답으로 교체
- `src/types`: 도메인 타입
- `src/stores`: 여러 화면에서 공유하는 전역 상태
- `src/utils`: 프레임워크와 무관한 공통 유틸리티

`src/routeTree.gen.ts`는 Vite TanStack Router 플러그인이 생성하므로 직접 수정하지 않습니다.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## Next steps

1. 실제 프로젝트 도메인 타입과 API client를 `types` 및 새 `api` 경계로 추가합니다.
2. 인증처럼 전역 수명주기가 필요한 상태만 `stores`에 둡니다.
3. 특정 도메인에만 쓰이는 상태와 UI는 해당 기능 폴더 안에 둡니다.
4. `pages`에는 데이터 fetching 세부 구현을 누적하지 않고, 기능 모듈과 컴포넌트를 조합하는 역할만 남깁니다.
