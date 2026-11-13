import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, unproject, fitView, regionsInView, WORLD_WIDTH, WORLD_HEIGHT } from '../src/pages/map/map-geometry.ts';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('경위도 → 화면 → 경위도가 원래 값으로 돌아온다', () => {
  for (const [lng, lat] of [[126.766, 37.5035], [127.0286, 37.2636], [125.8, 38.6], [128.2, 36.5]]) {
    const [x, y] = project([lng, lat]);
    const [lng2, lat2] = unproject([x, y]);
    close(lng, lng2);
    close(lat, lat2);
  }
});

test('원점은 0,0이고 경기도 끝은 세계 크기와 같다 (북쪽이 위)', () => {
  assert.deepEqual(project([125.8, 38.6]), [0, 0]);
  const [x, y] = project([128.2, 36.5]);
  close(x, WORLD_WIDTH, 1e-6);
  close(y, WORLD_HEIGHT, 1e-6);
  assert.ok(project([126.8, 37.5])[1] < project([126.8, 37.4])[1], '북쪽일수록 y가 작다');
});

test('fitView는 bbox를 다 담는 정사각형이고 가운데가 bbox 가운데다', () => {
  const bbox = [126.74, 37.46, 126.84, 37.55]; // 부천 근처
  const view = fitView(bbox);
  const [x1, y1] = project([bbox[0], bbox[3]]);
  const [x2, y2] = project([bbox[2], bbox[1]]);
  assert.ok(view.x <= x1 && view.y <= y1 && view.x + view.size >= x2 && view.y + view.size >= y2);
  close(view.x + view.size / 2, (x1 + x2) / 2, 1e-6);
  close(view.y + view.size / 2, (y1 + y2) / 2, 1e-6);
});

test('화면과 겹치는 지역만 고르고, 먼 지역은 뺀다', () => {
  const regions = [
    { regionCode: '3105', bbox: [126.74, 37.46, 126.84, 37.55] }, // 부천
    { regionCode: '3115', bbox: [126.69, 37.30, 126.90, 37.46] }, // 시흥 (부천 바로 아래)
    { regionCode: '3155', bbox: [126.79, 37.93, 127.19, 38.28] }, // 연천 (멀리 북쪽)
  ];
  const view = fitView(regions[0].bbox);
  assert.deepEqual(regionsInView(regions, view), ['3105', '3115']);
});