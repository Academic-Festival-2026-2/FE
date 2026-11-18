import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  analyzePixels,
  chooseRepresentative,
  dominantIndex,
  COLOR_HEX,
  COLOR_NAMES,
} from "../src/features/photo/color-analysis.ts";
import {
  futureTakenAtError,
  parseLocalTime,
  timeBand,
  validateColors,
  validateImage,
  findDong,
  MAX_IMAGE_BYTES,
} from "../src/pages/photo-upload/photo-validation.ts";
import { photoUploadTimeFields } from "../src/pages/photo-upload/photo-upload-time.ts";

const pixel = (hex, alpha = 255) => [
  ...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  alpha,
];

// w×h 이미지: color(x, y)가 [r, g, b] 또는 [r, g, b, a]를 돌려줌
const image = (w, h, color) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b, a = 255] = color(x, y);
      data.set([r, g, b, a], (y * w + x) * 4);
    }
  return analyzePixels(data, w, h);
};
const nameOf = (hex) => COLOR_NAMES[COLOR_HEX.indexOf(hex)];

test("모든 기준색 한 픽셀 결과가 API 계약을 만족하고 첫 후보가 대표색이다", () => {
  assert.equal(COLOR_HEX.length, 40);
  assert.equal(COLOR_NAMES.length, 40);
  for (const hex of COLOR_HEX) {
    const result = analyzePixels(new Uint8ClampedArray(pixel(hex)));
    assert.ok(validateColors(result.palette, result.bins));
    assert.ok(Math.abs(result.bins.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    assert.equal(result.candidates[0], result.palette[0]);
    assert.equal(result.ratios[0], result.bins[COLOR_HEX.indexOf(result.palette[0])]);
  }
});
test("대표색에 헷갈리는 짝이 있으면 다음 색 자리에 짝을 넣는다", () => {
  // 단풍 빨강 + 회색 바닥 + 작은 초록: 원래 [단풍 빨강, 아스팔트(다음 색), 나무 초록(선명한 색)] → 다음 색 자리가 짝(나무 · 흙)으로
  const result = image(12, 12, (x, y) =>
    y < 7 ? [150, 70, 50] : x < 11 ? [128, 128, 128] : [60, 150, 60],
  );
  assert.deepEqual(result.candidates.map(nameOf), ["단풍 빨강", "나무 · 흙", "나무 초록"]);
});
test("대표색이 유채색이어도 사진 대부분이 무채색이면 가장 넓은 무채색을 후보에 넣는다", () => {
  // 눈 덮인 풍경: 가운데 붉은 문(유채색 대표색) + 밝기가 조금씩 다른 눈(무채색 여러 칸)
  const snow = image(16, 16, (x, y) =>
    x >= 5 && x < 11 && y >= 4 && y < 12
      ? [170, 50, 40]
      : [205 + (x % 3) * 12, 208 + (x % 3) * 12, 212 + (x % 3) * 12],
  );
  assert.equal(nameOf(snow.palette[0]), "단풍 빨강");
  assert.equal(snow.candidates.length, 3);
  assert.ok(
    snow.candidates.slice(1).some((hex) => COLOR_HEX.indexOf(hex) >= 34),
    `무채색 후보 없음: ${snow.candidates.map(nameOf)}`,
  );
});
test("색상 규칙표: 사진처럼 흐린 색도 대상 색으로 분류한다", () => {
  // 가장 가까운 색으로 고르면 셋 다 나무 · 흙(#8A6245) 쪽으로 가던 색
  assert.equal(nameOf(image(4, 4, () => [150, 70, 50]).palette[0]), "단풍 빨강");
  assert.equal(nameOf(image(4, 4, () => [190, 160, 50]).palette[0]), "은행 노랑");
  assert.equal(nameOf(image(4, 4, () => [45, 75, 45]).palette[0]), "짙은 숲");
  assert.equal(nameOf(image(4, 4, () => [110, 160, 220]).palette[0]), "하늘");
  assert.equal(nameOf(image(4, 4, () => [128, 128, 128]).palette[0]), "아스팔트");
});
test("새벽 회청 하늘·바다는 팔레트 색 근처면 자동으로 분류된다", () => {
  assert.equal(nameOf(image(4, 4, () => [169, 182, 204]).palette[0]), "새벽 회청 하늘"); // #A9B6CC
  assert.equal(nameOf(image(4, 4, () => [60, 143, 181]).palette[0]), "바다"); // #3C8FB5
});
test("색으로 하늘과 구분이 어려운 새벽 회청 하늘·바다는 하늘의 짝 후보로도 고를 수 있다", () => {
  const sky = image(4, 4, () => [156, 200, 236]); // #9CC8EC 하늘
  assert.equal(nameOf(sky.palette[0]), "하늘");
  assert.ok(sky.candidates.map(nameOf).includes("새벽 회청 하늘"));
  const deepSky = image(4, 4, () => [90, 143, 208]); // #5A8FD0 짙은 하늘
  assert.equal(nameOf(deepSky.palette[0]), "짙은 하늘");
  assert.ok(deepSky.candidates.map(nameOf).includes("바다"));
  for (const [analysis, name] of [
    [sky, "새벽 회청 하늘"],
    [deepSky, "바다"],
  ]) {
    const chosen = chooseRepresentative(analysis, COLOR_HEX[COLOR_NAMES.indexOf(name)]);
    assert.equal(nameOf(chosen.palette[0]), name);
    assert.ok(validateColors(chosen.palette, chosen.bins));
  }
});
test("40색 모두 자동 분류나 후보로 나올 수 있다", () => {
  // 규칙표가 직접 돌려주는 색 + 짝 후보로만 나오는 색을 합치면 40색 전부
  // 밤 조명색은 어두운 사진 속 밝은 픽셀일 때만 나와서, 검은 픽셀 9개 + 그 색 1개짜리 사진도 같이 확인
  const reachable = new Set();
  const black = [12, 12, 15, 255];
  for (let r = 0; r < 256; r += 10)
    for (let g = 0; g < 256; g += 10)
      for (let b = 0; b < 256; b += 10) {
        analyzePixels(new Uint8ClampedArray([r, g, b, 255])).candidates.forEach((hex) =>
          reachable.add(hex),
        );
        if (r % 20 || g % 20 || b % 20) continue;
        analyzePixels(
          new Uint8ClampedArray([...Array(9).fill(black).flat(), r, g, b, 255]),
        ).candidates.forEach((hex) => reachable.add(hex));
      }
  assert.deepEqual(COLOR_HEX.filter((hex) => !reachable.has(hex)).map(nameOf), []);
});
test("어두운 사진의 밝은 따뜻한 색은 창문 불빛으로 본다", () => {
  const night = image(10, 10, (x, y) =>
    x >= 4 && x < 7 && y >= 4 && y < 7 ? [240, 200, 120] : [15, 15, 20],
  );
  assert.equal(nameOf(night.palette[0]), "창문 불빛");
  // 창문 불빛은 금빛 노을과 헷갈릴 수 있어 짝으로 같이 보여 줌
  assert.deepEqual(night.candidates.map(nameOf), ["창문 불빛", "금빛 노을", "먹색"]);
});
test("투명한 픽셀은 세지 않고, 대표색 5개의 첫 색은 BE 대표색 규칙과 같다", () => {
  const result = image(6, 6, (x) => (x < 3 ? [150, 70, 50] : [110, 160, 220, 0]));
  assert.equal(result.bins[COLOR_HEX.indexOf("#9CC8EC")], 0);
  assert.equal(result.palette[0], COLOR_HEX[dominantIndex(result.bins)]);
});
test("후보를 고르면 대표색(5색 첫 색)만 바뀌고 분포(bins)는 그대로다", () => {
  const analysis = image(10, 10, (x, y) => (y < 4 ? [150, 70, 50] : [128, 128, 128]));
  assert.deepEqual(analysis.candidates.map(nameOf), ["단풍 빨강", "나무 · 흙", "아스팔트"]);
  assert.equal(chooseRepresentative(analysis, analysis.candidates[0]), analysis);
  // 짝(나무 · 흙)은 사진에 거의 없어도(비율 0) 고르면 대표색이 됨
  const pair = chooseRepresentative(analysis, analysis.candidates[1]);
  assert.equal(nameOf(pair.palette[0]), "나무 · 흙");
  assert.deepEqual(pair.bins, analysis.bins);
  assert.ok(validateColors(pair.palette, pair.bins));
  // 유채색이 많은 사진에서 무채색을 골라도 분포를 부풀리지 않음 (동 지도 칸 집계 왜곡 방지)
  const chosen = chooseRepresentative(analysis, analysis.candidates[2]);
  assert.equal(chosen.palette[0], analysis.candidates[2]);
  assert.deepEqual(chosen.bins, analysis.bins);
  assert.equal(
    new Set(chosen.palette.filter((c) => c !== chosen.palette[0])).size,
    chosen.palette.filter((c) => c !== chosen.palette[0]).length,
  );
  assert.ok(validateColors(chosen.palette, chosen.bins));
  assert.deepEqual(chosen.candidates, analysis.candidates);
});
test("투명 이미지와 잘못된 색상 데이터 거부", () => {
  assert.throws(() => analyzePixels(new Uint8ClampedArray([0, 0, 0, 0])));
  assert.throws(() => analyzePixels(new Uint8ClampedArray(3)));
  const valid = analyzePixels(new Uint8ClampedArray(pixel(COLOR_HEX[0])));
  assert.equal(validateColors(valid.palette, Array(39).fill(0)), false);
  assert.equal(validateColors(valid.palette, [NaN, ...Array(39).fill(0)]), false);
  assert.equal(validateColors(Array(5).fill("#abcdef"), valid.bins), false);
});
test("KST 로컬 시각 검증과 시간대 경계", () => {
  assert.equal(parseLocalTime("2026:11:07 16:00:00"), "2026-11-07T16:00:00");
  assert.equal(parseLocalTime("2024-02-29T08:00"), "2024-02-29T08:00:00");
  for (const value of [
    "2026-02-29T12:00",
    "2026-11-07T24:00",
    "2026-11-07T12:00:00Z",
    "2026-11-07T12:00:00+09:00",
  ])
    assert.equal(parseLocalTime(value), undefined);
  for (const [hour, band] of [
    [4, "NIGHT"],
    [5, "DAWN"],
    [8, "DAY"],
    [16, "SUNSET"],
    [19, "NIGHT"],
  ])
    assert.equal(timeBand(`2026-11-07T${String(hour).padStart(2, "0")}:00`), band);
});
test("과거·미래 연도의 촬영 시각을 형식에 따라 파싱한다", () => {
  for (const value of [
    "2024-03-01T00:00",
    "2025-08-31T23:59",
    "2026-12-01T00:00",
    "2028-02-29T12:00",
    "2030-03-01T09:00",
  ]) {
    assert.ok(parseLocalTime(value), value);
  }
  assert.equal(parseLocalTime("2025-02-29T12:00"), undefined);
});
test("KST 현재 시각 이후 촬영된 사진만 거부한다", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  assert.equal(futureTakenAtError("2024-02-29T08:00", now), undefined);
  assert.equal(futureTakenAtError("2026-11-16T20:59:59", now), undefined);
  assert.equal(futureTakenAtError("2026-11-16T21:00:00", now), undefined);
  assert.match(futureTakenAtError("2026-11-16T21:00:01", now), /미래/);
  assert.match(futureTakenAtError("2030-03-01T09:00", now), /미래/);
  assert.equal(futureTakenAtError("invalid", now), undefined);
});

test("파일 확장자가 아니라 JPEG/PNG 시그니처와 크기를 검사한다", async () => {
  await validateImage(new File([new Uint8Array([255, 216, 255, 0])], "x.jpg"));
  await validateImage(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "x.png"));
  await assert.rejects(validateImage(new File(["not image"], "fake.jpg")));
  await assert.rejects(validateImage(new File([], "empty.jpg")));
  await assert.rejects(validateImage(new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "large.jpg")));
});
test("행정동 탐색은 위경도 순서와 내부 구멍을 구분한다", () => {
  const feature = {
    geometry: {
      coordinates: [
        [
          [
            [126, 37],
            [128, 37],
            [128, 39],
            [126, 39],
            [126, 37],
          ],
          [
            [126.5, 37.5],
            [127.5, 37.5],
            [127.5, 38.5],
            [126.5, 38.5],
            [126.5, 37.5],
          ],
        ],
      ],
    },
  };
  assert.equal(findDong([feature], 37.2, 126.2), feature);
  assert.equal(findDong([feature], 38, 127), undefined);
  assert.equal(findDong([feature], 40, 129), undefined);
});

// Vite 환경 치환과 인증 저장소 mock으로 실제 API 클라이언트와 FormData 생성 함수를 검증합니다.
const moduleUrl = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText,
  ).toString("base64");
test("실제 업로드 함수의 image/data 파트·JWT·응답·409 오류", async () => {
  const client = moduleUrl(
    (await readFile(new URL("../src/api/client.ts", import.meta.url), "utf8"))
      .replace("import.meta.env.VITE_API_BASE_URL", '""')
      .replace(
        'import { useAuthStore } from "../stores/auth-store";',
        'const useAuthStore = { getState: () => ({ tokens: { accessToken: "test-token" } }) };',
      ),
  );
  const photo = moduleUrl(
    (await readFile(new URL("../src/api/photo.ts", import.meta.url), "utf8")).replace(
      '"./client"',
      JSON.stringify(client),
    ),
  );
  const { uploadPhoto } = await import(photo);
  const original = globalThis.fetch;
  const data = {
    dongCode: "test-dong",
    takenAt: "2026-11-07T16:00:00",
    isPublic: true,
    ...analyzePixels(new Uint8ClampedArray(pixel(COLOR_HEX[0]))),
  };
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "/api/photos");
      assert.equal(init.method, "POST");
      assert.equal(init.headers.get("Authorization"), "Bearer test-token");
      assert.equal(init.headers.has("Content-Type"), false);
      assert.deepEqual([...init.body.keys()], ["image", "data"]);
      assert.equal(init.body.get("data").type, "application/json");
      assert.deepEqual(JSON.parse(await init.body.get("data").text()), data);
      return Response.json(
        { isSuccess: true, code: "PHOTO201_1", result: { photoId: 1 } },
        { status: 201 },
      );
    };
    assert.deepEqual(await uploadPhoto(new File(["fixture"], "test.jpg"), data), { photoId: 1 });
    globalThis.fetch = async () =>
      Response.json(
        { isSuccess: false, code: "PHOTO409_1", message: "중복 사진" },
        { status: 409 },
      );
    await assert.rejects(
      uploadPhoto(new File(["fixture"], "test.jpg"), data),
      (error) => error.status === 409 && error.code === "PHOTO409_1",
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("촬영 시각 없는 사진은 season/timeBand만 보내고 takenAt을 만들지 않는다", async () => {
  const client = moduleUrl(
    (await readFile(new URL("../src/api/client.ts", import.meta.url), "utf8"))
      .replace("import.meta.env.VITE_API_BASE_URL", '""')
      .replace(
        'import { useAuthStore } from "../stores/auth-store";',
        'const useAuthStore = { getState: () => ({ tokens: { accessToken: "test-token" } }) };',
      ),
  );
  const photoModule = moduleUrl(
    (await readFile(new URL("../src/api/photo.ts", import.meta.url), "utf8")).replace(
      '"./client"',
      JSON.stringify(client),
    ),
  );
  const { uploadPhoto } = await import(photoModule);
  const original = globalThis.fetch;
  const data = {
    dongCode: "31050110",
    season: "AUTUMN",
    timeBand: "SUNSET",
    isPublic: false,
    ...analyzePixels(new Uint8ClampedArray(pixel(COLOR_HEX[0]))),
  };
  try {
    globalThis.fetch = async (_url, init) => {
      const payload = JSON.parse(await init.body.get("data").text());
      assert.equal(payload.takenAt, undefined);
      assert.equal(payload.season, "AUTUMN");
      assert.equal(payload.timeBand, "SUNSET");
      return Response.json(
        { isSuccess: true, code: "PHOTO201_1", result: { photoId: 2 } },
        { status: 201 },
      );
    };
    assert.deepEqual(await uploadPhoto(new File(["fixture"], "test.jpg"), data), { photoId: 2 });
  } finally {
    globalThis.fetch = original;
  }
});

// 실제 EXIF 바이너리를 구성합니다. 이미지 디코더는 Node에 없어 이 테스트에서만 대체합니다.
function exifJpeg(withTime, withGps) {
  const tiff = Buffer.alloc(256);
  tiff.write("II");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  const entry = (offset, tag, type, count, value) => {
    tiff.writeUInt16LE(tag, offset);
    tiff.writeUInt16LE(type, offset + 2);
    tiff.writeUInt32LE(count, offset + 4);
    tiff.writeUInt32LE(value, offset + 8);
  };
  tiff.writeUInt16LE(Number(withTime) + Number(withGps), 8);
  let offset = 10;
  if (withTime) {
    entry(offset, 0x8769, 4, 1, 40);
    offset += 12;
  }
  if (withGps) entry(offset, 0x8825, 4, 1, 80);
  if (withTime) {
    tiff.writeUInt16LE(1, 40);
    entry(42, 0x9003, 2, 20, 60);
    tiff.write("2026:11:07 16:30:00\0", 60);
  }
  if (withGps) {
    tiff.writeUInt16LE(4, 80);
    entry(82, 1, 2, 2, 78);
    entry(94, 2, 5, 3, 140);
    entry(106, 3, 2, 2, 69);
    entry(118, 4, 5, 3, 164);
    for (const [start, values] of [
      [140, [37, 30, 0]],
      [164, [126, 48, 0]],
    ]) {
      values.forEach((value, i) => {
        tiff.writeUInt32LE(value, start + i * 8);
        tiff.writeUInt32LE(1, start + i * 8 + 4);
      });
    }
  }
  const payload = Buffer.concat([Buffer.from("Exif\0\0"), tiff]);
  const header = Buffer.from([255, 216, 255, 225, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 4);
  return Buffer.concat([header, payload, Buffer.from([255, 217])]);
}
test("실제 EXIF 파서로 위치·시각 네 가지 조합을 추출한다", async () => {
  const validation = new URL("../src/pages/photo-upload/photo-validation.ts", import.meta.url).href;
  const exifr = new URL("../node_modules/exifr/dist/full.esm.mjs", import.meta.url).href;
  const source = (
    await readFile(new URL("../src/pages/photo-upload/photo-metadata.ts", import.meta.url), "utf8")
  )
    .replace('"exifr"', JSON.stringify(exifr))
    .replace('"./photo-validation"', JSON.stringify(validation))
    .replace("exifr.parse(file,", "exifr.parse(await file.arrayBuffer(),");
  const { readPhoto } = await import(moduleUrl(source));
  const original = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => ({ close() {} });
  try {
    for (const time of [false, true])
      for (const gps of [false, true]) {
        const result = await readPhoto(
          new File([exifJpeg(time, gps)], "exif.jpg", { type: "image/jpeg" }),
        );
        assert.equal(result.takenAt, time ? "2026-11-07T16:30:00" : undefined);
        assert.equal(result.latitude, gps ? 37.5 : undefined);
        assert.equal(result.longitude, gps ? 126.8 : undefined);
      }
  } finally {
    globalThis.createImageBitmap = original;
  }
});

test("EXIF 촬영 시각이 있으면 날짜만 전송한다", () => {
  assert.deepEqual(
    photoUploadTimeFields("2026-10-20T15:30:00", "2026-10-20T15:30:00", "SPRING", "NIGHT"),
    { takenAt: "2026-10-20T15:30:00" },
  );
});

test("EXIF 촬영 시각이 없으면 선택한 사계절과 시간대만 전송한다", () => {
  for (const season of ["SPRING", "SUMMER", "AUTUMN", "WINTER"]) {
    assert.deepEqual(photoUploadTimeFields(undefined, undefined, season, "SUNSET"), {
      season,
      timeBand: "SUNSET",
    });
  }
});

test("필수 촬영 정보가 누락되면 업로드 요청을 생성하지 않는다", () => {
  assert.equal(photoUploadTimeFields(undefined, undefined, "", "DAY"), null);
  assert.equal(photoUploadTimeFields(undefined, undefined, "AUTUMN", ""), null);
  assert.equal(photoUploadTimeFields("invalid", undefined, "", ""), null);
});
