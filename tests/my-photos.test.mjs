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

test("내 사진 목록/상세/삭제는 인증 API 및 올바른 경로를 사용한다", async () => {
  const mockClient = moduleUrl(
    'export const authRequest = (...args) => globalThis.__myPhotosAuthRequest(...args); export const request = () => { throw new Error("인증 없는 API 사용 금지") }; export const optionalAuthRequest = () => { throw new Error("인증 없는 API 사용 금지") };',
  );
  const source = (await readFile(new URL("../src/api/photo.ts", import.meta.url), "utf8")).replace(
    '"./client"',
    JSON.stringify(mockClient),
  );
  const { getMyPhotos, getPhotoDetail, deletePhoto, updatePhotoVisibility } = await import(
    moduleUrl(source)
  );
  const calls = [];
  globalThis.__myPhotosAuthRequest = async (...args) => {
    calls.push(args);
    return args[1]?.method === "DELETE" || args[1]?.method === "PATCH"
      ? undefined
      : { photos: [], page: 1, size: 12, totalElements: 0, hasNext: false };
  };
  try {
    await getMyPhotos(1, 12);
    await getPhotoDetail(123, true);
    await deletePhoto(123);
    await updatePhotoVisibility(123, false);
    await updatePhotoVisibility(123, true);
    assert.deepEqual(calls, [
      ["/api/users/me/photos?page=1&size=12"],
      ["/api/photos/123"],
      ["/api/photos/123", { method: "DELETE" }],
      ["/api/photos/123", { method: "PATCH", body: '{"isPublic":false}' }],
      ["/api/photos/123", { method: "PATCH", body: '{"isPublic":true}' }],
    ]);
  } finally {
    delete globalThis.__myPhotosAuthRequest;
  }
});
