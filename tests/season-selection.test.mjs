import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseSeason,
  currentSeason,
  parseSeason,
  preferredSeason,
  rememberSeason,
  LAST_SEASON_KEY,
} from "../src/utils/season.ts";

test("URL, 마지막 선택, 현재 계절 순서로 적용한다", () => {
  const date = new Date("2026-11-16T00:00:00Z");
  assert.equal(chooseSeason("SPRING", "WINTER", date), "SPRING");
  assert.equal(chooseSeason(undefined, "WINTER", date), "WINTER");
  assert.equal(chooseSeason(undefined, undefined, date), "AUTUMN");
});

test("잘못된 계절 값은 무시한다", () => {
  assert.equal(parseSeason("INVALID"), undefined);
  assert.equal(chooseSeason("INVALID", "SUMMER"), "SUMMER");
});

test("한국 시간 12월 1일에 가을에서 겨울로 변경된다", () => {
  assert.equal(currentSeason(new Date("2026-11-30T14:59:59Z")), "AUTUMN");
  assert.equal(currentSeason(new Date("2026-11-30T15:00:00Z")), "WINTER");
});

test("마지막 계절 선택 저장과 URL 우선순위를 유지한다", () => {
  const previousWindow = globalThis.window;
  const store = new Map();

  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
    },
  };

  try {
    rememberSeason("WINTER");

    assert.equal(store.get(LAST_SEASON_KEY), "WINTER");
    assert.equal(preferredSeason(), "WINTER");
    assert.equal(preferredSeason("SPRING"), "SPRING");
    assert.equal(preferredSeason("INVALID"), "WINTER");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("브라우저 저장소 사용이 제한되어도 계절 선택은 예외 없이 동작한다", () => {
  const previousWindow = globalThis.window;

  globalThis.window = {
    localStorage: {
      getItem: () => {
        throw new Error("Storage blocked");
      },
      setItem: () => {
        throw new Error("Storage blocked");
      },
    },
  };

  try {
    assert.equal(preferredSeason("SUMMER"), "SUMMER");
    assert.doesNotThrow(() => rememberSeason("AUTUMN"));
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
