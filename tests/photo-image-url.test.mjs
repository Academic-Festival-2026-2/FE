import assert from "node:assert/strict";
import { test } from "node:test";
import { photoImageUrl } from "../src/pages/dong/photo-image-url.ts";

test("축소 이미지(displayUrl)가 있으면 그 주소를 쓴다", () => {
  assert.equal(photoImageUrl({ imageUrl: "original.jpg", displayUrl: "display.jpg" }), "display.jpg");
});

test("축소 이미지가 없으면(null·없음) 원본 주소를 쓴다", () => {
  assert.equal(photoImageUrl({ imageUrl: "original.jpg", displayUrl: null }), "original.jpg");
  assert.equal(photoImageUrl({ imageUrl: "original.jpg" }), "original.jpg");
});

test("사진 파일이 없으면 null", () => {
  assert.equal(photoImageUrl({ imageUrl: null, displayUrl: null }), null);
  assert.equal(photoImageUrl({ imageUrl: null }), null);
});
