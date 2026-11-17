import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_DETAIL_TTL_MS, detailTtl } from "../src/pages/dong/photo-detail-ttl.ts";

const signedUrl = (params) =>
  `https://bucket.s3.ap-northeast-2.amazonaws.com/photos/original/a.jpg?${new URLSearchParams(params)}`;

test("서명 주소의 X-Amz-Expires에서 1분을 뺀 시간만 상세를 다시 쓴다", () => {
  assert.equal(detailTtl({ imageUrl: signedUrl({ "X-Amz-Expires": "300" }) }), 240_000);
  assert.equal(detailTtl({ imageUrl: signedUrl({ "X-Amz-Expires": "600" }) }), 540_000);
});

test("서명 시각(X-Amz-Date)과 이 기기 시계는 보지 않는다", () => {
  // 기기 시계보다 한참 전·후에 서명됐어도 받은 때 기준으로 같은 시간
  for (const date of ["20000101T000000Z", "20991231T235959Z", "형식이 다름"]) {
    assert.equal(
      detailTtl({ imageUrl: signedUrl({ "X-Amz-Date": date, "X-Amz-Expires": "300" }) }),
      240_000,
    );
  }
});

test("만료 시간이 1분 이하면 바로 만료로 본다 (음수가 되지 않음)", () => {
  assert.equal(detailTtl({ imageUrl: signedUrl({ "X-Amz-Expires": "60" }) }), 0);
  assert.equal(detailTtl({ imageUrl: signedUrl({ "X-Amz-Expires": "30" }) }), 0);
});

test("축소 이미지 주소(displayUrl)가 있으면 그 주소의 만료 시간을 본다", () => {
  assert.equal(
    detailTtl({
      imageUrl: signedUrl({ "X-Amz-Expires": "600" }),
      displayUrl: signedUrl({ "X-Amz-Expires": "300" }),
    }),
    240_000,
  );
});

test("축소 이미지가 없으면(null·없음) 원본 주소의 만료 시간을 본다", () => {
  const imageUrl = signedUrl({ "X-Amz-Expires": "600" });
  assert.equal(detailTtl({ imageUrl, displayUrl: null }), 540_000);
  assert.equal(detailTtl({ imageUrl }), 540_000);
});

test("사진 파일이 없거나 만료 시간을 알 수 없으면 기본값(4분)", () => {
  assert.equal(DEFAULT_DETAIL_TTL_MS, 240_000);
  assert.equal(detailTtl({ imageUrl: null }), DEFAULT_DETAIL_TTL_MS);
  assert.equal(detailTtl({ imageUrl: signedUrl({}) }), DEFAULT_DETAIL_TTL_MS);
  assert.equal(
    detailTtl({ imageUrl: signedUrl({ "X-Amz-Expires": "abc" }) }),
    DEFAULT_DETAIL_TTL_MS,
  );
  assert.equal(detailTtl({ imageUrl: signedUrl({ "X-Amz-Expires": "0" }) }), DEFAULT_DETAIL_TTL_MS);
  assert.equal(detailTtl({ imageUrl: "/상대 주소.jpg" }), DEFAULT_DETAIL_TTL_MS);
});
