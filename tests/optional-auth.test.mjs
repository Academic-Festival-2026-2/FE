import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(
  ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText,
).toString('base64');

// exp(초)만 담은 가짜 JWT
const jwt = exp => ['{"alg":"HS256"}', JSON.stringify({ sub: '1', exp })]
  .map(part => Buffer.from(part).toString('base64url')).join('.') + '.sig';
const now = () => Math.floor(Date.now() / 1000);

// 매번 새 모듈(재발급 상태 공유 안 함) + 가짜 저장소·fetch로 optionalAuthRequest를 부름
// reissue(store)는 재발급 응답 전에 로그아웃·다른 계정 로그인을 흉내 낼 수 있음 (logout, login)
async function run(tokens, reissue) {
  const store = { tokens, session: 0 };
  store.logout = () => { store.tokens = null; store.session += 1; };
  store.login = next => { store.tokens = next; store.session += 1; };
  globalThis.__authStore = {
    getState: () => ({
      tokens: store.tokens,
      session: store.session,
      updateTokens: next => { store.tokens = next; },
      clearTokens: store.logout,
    }),
  };
  // 같은 data URL 모듈은 캐시되므로 부를 때마다 지금 테스트의 저장소를 읽게 함
  const mockStore = moduleUrl('export const useAuthStore = { getState: () => globalThis.__authStore.getState() };');
  const source = (await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8'))
    .replace('"../stores/auth-store"', JSON.stringify(mockStore))
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined');
  const { optionalAuthRequest } = await import(moduleUrl(source + `\n// ${Math.random()}`));

  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push([url, new Headers(init.headers).get('Authorization')]);
    if (url === '/api/auth/reissue') return reissue(store);
    return Response.json({ isSuccess: true, code: 'OK', message: '', result: { liked: true } });
  };
  try {
    await optionalAuthRequest('/api/photos/7');
  } finally {
    globalThis.fetch = realFetch;
    delete globalThis.__authStore;
  }
  return { calls, tokens: store.tokens };
}

const ok = tokens => Response.json({ isSuccess: true, code: 'OK', message: '', result: tokens });

test('만료되지 않은 토큰은 그대로 붙여 보냄', async () => {
  const token = jwt(now() + 600);
  const { calls } = await run({ accessToken: token, refreshToken: 'r' }, () => assert.fail('재발급하면 안 됨'));
  assert.deepEqual(calls, [['/api/photos/7', `Bearer ${token}`]]);
});

test('만료(또는 30초 안에 만료)된 토큰은 보내기 전에 재발급하고 새 토큰으로 보냄', async () => {
  for (const exp of [now() - 60, now() + 10]) {
    const fresh = jwt(now() + 1800);
    const { calls, tokens } = await run(
      { accessToken: jwt(exp), refreshToken: 'r' },
      () => ok({ accessToken: fresh, refreshToken: 'r2' }),
    );
    assert.deepEqual(calls, [['/api/auth/reissue', null], ['/api/photos/7', `Bearer ${fresh}`]]);
    assert.equal(tokens.accessToken, fresh);
  }
});

test('재발급이 거절되면 로그아웃하고 토큰 없이 보냄', async () => {
  const { calls, tokens } = await run(
    { accessToken: jwt(now() - 60), refreshToken: 'r' },
    () => Response.json({ isSuccess: false, code: 'USER401_2', message: '' }, { status: 401 }),
  );
  assert.deepEqual(calls, [['/api/auth/reissue', null], ['/api/photos/7', null]]);
  assert.equal(tokens, null);
});

test('재발급을 기다리는 사이 로그아웃하면 이전 토큰을 되살리지 않음', async () => {
  const { calls, tokens } = await run(
    { accessToken: jwt(now() - 60), refreshToken: 'r' },
    store => {
      store.logout();
      return ok({ accessToken: jwt(now() + 1800), refreshToken: 'r2' });
    },
  );
  assert.equal(tokens, null);
  assert.deepEqual(calls, [['/api/auth/reissue', null], ['/api/photos/7', null]]);
});

test('재발급을 기다리는 사이 다른 계정으로 로그인하면 새 계정 토큰을 덮어쓰지 않음', async () => {
  // 재발급 응답 토큰(now + 1800)과 구별되게 만료 시각을 다르게 둠
  const other = jwt(now() + 1700);
  const { calls, tokens } = await run(
    { accessToken: jwt(now() - 60), refreshToken: 'r' },
    store => {
      store.login({ accessToken: other, refreshToken: 'n' });
      return ok({ accessToken: jwt(now() + 1800), refreshToken: 'r2' });
    },
  );
  assert.equal(tokens.accessToken, other);
  assert.deepEqual(calls, [['/api/auth/reissue', null], ['/api/photos/7', `Bearer ${other}`]]);
});

test('이전 세션의 재발급이 거절돼도 그사이 로그인한 새 세션은 유지', async () => {
  const other = jwt(now() + 1800);
  const { tokens } = await run(
    { accessToken: jwt(now() - 60), refreshToken: 'r' },
    store => {
      store.login({ accessToken: other, refreshToken: 'n' });
      return Response.json({ isSuccess: false, code: 'USER401_2', message: '' }, { status: 401 });
    },
  );
  assert.equal(tokens.accessToken, other);
});

test('만료 시각을 읽을 수 없는 토큰은 그대로 보냄 (401이면 기존처럼 재발급)', async () => {
  const { calls } = await run({ accessToken: 'not-a-jwt', refreshToken: 'r' }, () => assert.fail('재발급하면 안 됨'));
  assert.deepEqual(calls, [['/api/photos/7', 'Bearer not-a-jwt']]);
});
