import assert from "node:assert/strict";
import { test } from "node:test";
import { COLOR_HEX } from "../src/pages/photo-upload/color-analysis.ts";
import { getPhotoColorRatios } from "../src/pages/dong/photo-color-ratios.ts";

function binsOf(entries) {
  const bins = Array(40).fill(0);
  for (const [index, value] of entries) bins[index] = value;
  return bins;
}

test("40색 bins에서 대표 5색 비율을 찾아 그대로 표시한다", () => {
  const palette = [COLOR_HEX[4], COLOR_HEX[0], COLOR_HEX[9], COLOR_HEX[39], COLOR_HEX[37]];
  const bins = binsOf([[4, .4], [0, .3], [9, .15], [39, .1], [37, .05]]);
  assert.deepEqual(getPhotoColorRatios(palette, bins), [.4, .3, .15, .1, .05]);
});

test("상위 5개 외의 bins는 제외하고 상대 비율을 정규화한다", () => {
  const ratios = getPhotoColorRatios(
    [COLOR_HEX[0], COLOR_HEX[1]], binsOf([[0, .4], [1, .2], [2, .4]]),
  );
  assert.ok(Math.abs(ratios[0] - 2 / 3) < 1e-12);
  assert.ok(Math.abs(ratios[1] - 1 / 3) < 1e-12);
});

test("한 가지 색만 있을 때 반복되는 palette는 첫 번째만 너비를 가진다", () => {
  const palette = Array(5).fill(COLOR_HEX[0]);
  assert.deepEqual(getPhotoColorRatios(palette, binsOf([[0, 1]])), [1, 0, 0, 0, 0]);
});

test("구형 API, 유효하지 않은 bins, 알 수 없는 팔레트는 균등 표시한다", () => {
  const palette = [COLOR_HEX[0], COLOR_HEX[1]];
  for (const invalid of [undefined, null, [], Array(40).fill(0), binsOf([[0, NaN]]), binsOf([[0, -1], [1, 2]])]) {
    assert.deepEqual(getPhotoColorRatios(palette, invalid), [.5, .5]);
  }
  assert.deepEqual(getPhotoColorRatios(["#ABCDEF", COLOR_HEX[0]], binsOf([[0, 1]])), [.5, .5]);
  assert.deepEqual(getPhotoColorRatios([], binsOf([[0, 1]])), []);
});

test("업로드에서 허용하는 bins 합계 오차 0.02를 비율 표시에서도 허용한다", () => {
  const palette = [COLOR_HEX[0], COLOR_HEX[1]];
  const withinTolerance = getPhotoColorRatios(palette, binsOf([[0, 0.49], [1, 0.5]]));
  assert.ok(Math.abs(withinTolerance[0] - 0.49 / 0.99) < 1e-12);
  assert.ok(Math.abs(withinTolerance[1] - 0.5 / 0.99) < 1e-12);
  assert.deepEqual(getPhotoColorRatios(palette, binsOf([[0, 0.5], [1, 0.521]])), [0.5, 0.5]);
});
