# 협업 규칙

## 브랜치

- `{타입}/{이슈번호}-{내용}` (예: `feat/86-mypage-redesign`, `fix/72-upload-error-gps`)
- `dev`에서 브랜치를 만들고, PR은 `dev`로 올립니다. `main`은 `dev` → `main` PR만 가능합니다.
- `dev`로 머지되면 브랜치는 자동 삭제됩니다. 추가 수정은 새 브랜치로 합니다.

## 커밋

- `[타입] 내용 #이슈번호` (예: `[feat] 마이페이지 활동 중심 구조로 개편 #86`)
- 타입은 소문자, 대괄호로 감쌉니다. 리뷰 반영 커밋에도 이슈번호를 붙입니다.
- 리뷰 반영 커밋도 변경 내용에 맞는 타입을 씁니다. (버그 지적 → `fix`, 디자인·포맷 지적 → `style`, 구조 변경 → `refactor`)
- 기능과 함께 작성한 테스트는 해당 기능 커밋에 포함하고, 테스트만 따로 추가·수정할 때는 `test`를 씁니다.

| 타입 | 언제 쓰나요 | 예시 |
|---|---|---|
| `feat` | 새 기능 (화면, API 연동) | `[feat] 마이페이지 활동 중심 구조로 개편 #86` |
| `fix` | 버그 수정 | `[fix] 내 사진 상세 표시를 공개·나만 보기로 변경 #64` |
| `refactor` | 동작 변경 없이 구조·이름·규칙 변경 | `[refactor] 경기도 확장 대비 덮개 범위 상수 통합 #64` |
| `style` | 포맷·화면 디자인 변경 (색, 간격, 문구 위치, 애니메이션) | `[style] 로그인·회원가입 오류 문구 색을 공통 오류 색으로 통일 #64` |
| `test` | 테스트만 추가·수정 | `[test] 사진 대표색 비율 계산 테스트 추가 #77` |
| `docs` | README 등 문서 수정 | `[docs] 협업 규칙 문서와 커밋 템플릿 추가 #91` |
| `chore` | 설정·잡일 (의존성, .env.example, vite·eslint 설정, 충돌 해결, 파일 정리) | `[chore] dev 반영(배지·내 사진 모아보기) 충돌 해결 #64` |
| `deploy` | 배포용 `dev` → `main` PR | `[deploy] 배포용 dev, main 머지 (#배포이슈번호)` |

### 커밋 템플릿

레포 최상위의 `.gitmessage`를 커밋 템플릿으로 쓰면 커밋 창에 형식 안내가 표시됩니다.
레포 안 어느 폴더에서든 한 번만 실행합니다. (PowerShell, cmd, Git Bash, macOS 터미널 공통)

```bash
git config commit.template .gitmessage
git config commit.cleanup strip
```

- 두 번째 줄은 IntelliJ 커밋 창처럼 메시지를 파일로 넘기는 방식에서도 `#` 안내 줄이 커밋 메시지에 남지 않게 합니다.
- 이 설정을 쓰면 메시지에서 `#`으로 시작하는 줄은 모두 지워지므로, 이슈번호는 제목 끝에 붙입니다.

## 이슈

- 제목: `[타입] 요약`
- 본문: `## 작업 내용` / `## 배경` / `## 완료 기준`
- Assignee는 본인으로 지정합니다.

## PR

- 제목: `[타입] 기능 요약 (#이슈번호)`
- 배포 PR(`dev` → `main`)은 `[deploy] 배포용 dev, main 머지 (#배포이슈번호)`로 올립니다.
- 본문

  ```markdown
  ## 이슈 및 작업중인 브랜치
  - close #이슈번호
  - {브랜치} → dev

  ## 주요내용
  - 팀원들이 참고할 내용 및 주요 변경점

  ## PR CheckList
  - [ ] Reviewers 등록
  - [ ] Assignees 등록
  - [ ] Label 등록
  - [ ] CI 정상 작동 확인
  ```

- `dev` 머지는 2명 이상 승인이 필요합니다.
- CodeRabbit 리뷰는 PR 댓글 `@coderabbitai review`로 요청합니다.

## CI

- `dev`·`main`으로 올린 PR과 `dev` push마다 GitHub Actions가 `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm build`를 실행합니다.
- `FE lint & build` 체크가 통과해야 `dev`에 머지할 수 있습니다.
- 실패하면 PR의 Checks 탭에서 로그를 확인합니다. 의존성을 추가했는데 `pnpm-lock.yaml`을 같이 커밋하지 않으면 install 단계에서 실패합니다.
- PR 전에 `pnpm lint`, `pnpm build`로 먼저 확인합니다.
- 테스트(`tests/`)는 CI에서 실행하지 않습니다. 관련 코드를 바꿨다면 `node --test tests/<파일>.mjs`로 직접 확인합니다. (폴더 통째로는 실행되지 않으니 파일을 지정합니다)

## 코드 스타일

- 컴포넌트 파일(`.tsx`)에서 상수를 export하면 react-refresh 린트 에러가 납니다. 상수는 `map-data.ts` 같은 일반 파일에 둡니다.
- 색은 고정값 대신 `src/index.css`의 `@theme` 토큰을 씁니다.
- `src/routes`에 라우트를 추가·변경하면 자동 생성되는 `src/routeTree.gen.ts`도 같이 커밋합니다. 직접 수정하지 않습니다.
