import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const moduleUrl = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText,
  ).toString("base64");

test("좋아요·좋아요 목록은 인증 API, 공유 지도 사진 상세는 선택 인증 API를 쓴다", async () => {
  const mockClient = moduleUrl(
    'export const authRequest = (...args) => globalThis.__likeCalls.push(["auth", ...args]);' +
      ' export const optionalAuthRequest = (...args) => globalThis.__likeCalls.push(["optional", ...args]);' +
      ' export const request = () => { throw new Error("토큰을 붙이지 않는 API 사용 금지") };',
  );
  const source = (await readFile(new URL("../src/api/photo.ts", import.meta.url), "utf8")).replace(
    '"./client"',
    JSON.stringify(mockClient),
  );
  const { likePhoto, unlikePhoto, getLikedPhotos, getPhotoDetail } = await import(
    moduleUrl(source)
  );
  globalThis.__likeCalls = [];
  try {
    await likePhoto(7);
    await unlikePhoto(7);
    await getLikedPhotos();
    await getLikedPhotos(2, 6);
    await getPhotoDetail(7);
    await getPhotoDetail(7, true);
    assert.deepEqual(globalThis.__likeCalls, [
      ["auth", "/api/photos/7/likes", { method: "POST" }],
      ["auth", "/api/photos/7/likes", { method: "DELETE" }],
      ["auth", "/api/users/me/liked-photos?page=0&size=12"],
      ["auth", "/api/users/me/liked-photos?page=2&size=6"],
      ["optional", "/api/photos/7"],
      ["auth", "/api/photos/7"],
    ]);
  } finally {
    delete globalThis.__likeCalls;
  }
});
