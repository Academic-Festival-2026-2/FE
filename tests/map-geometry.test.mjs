import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, unproject, fitView, regionsInView, regionAt, regionOutline, WORLD_WIDTH, WORLD_HEIGHT } from '../src/pages/map/map-geometry.ts';

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

test('점이 들어 있는 지역을 찾고, 구멍 안이나 밖이면 null', () => {
  const square = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const regions = [
    { regionCode: 'A', features: [{ geometry: { coordinates: [[square(0, 0, 10, 10), square(4, 4, 6, 6)]] } }] },
    { regionCode: 'B', features: [{ geometry: { coordinates: [[square(10, 0, 20, 10)]] } }] },
  ];
  assert.equal(regionAt(regions, [2, 2]), 'A');
  assert.equal(regionAt(regions, [15, 5]), 'B');
  assert.equal(regionAt(regions, [5, 5]), null); // A의 구멍
  assert.equal(regionAt(regions, [30, 30]), null); // 밖
});

test('regionOutline은 동끼리 맞닿은 선은 빼고 지역 바깥 테두리만 그린다', () => {
  // 가로로 붙은 정사각형 동 두 개: 가운데 세로선(경도 127)은 두 동이 같이 씀
  const dong = (code, ring) => ({ properties: { dongCode: code }, geometry: { coordinates: [[ring]] } });
  const left = [[126, 37], [127, 37], [127, 38], [126, 38], [126, 37]];
  const right = [[127, 37], [128, 37], [128, 38], [127, 38], [127, 37]];
  const path = regionOutline({ regionCode: '9999', features: [dong('a', left), dong('b', right)] });

  const [mx, my] = project([127, 37]).map((v) => v.toFixed(1));
  const [tx, ty] = project([127, 38]).map((v) => v.toFixed(1));
  // 맞닿은 가운데 선은 어느 방향으로도 그려지지 않고, 바깥 테두리 선분 6개만 남는다
  assert.ok(!path.includes(`${mx},${my}L${tx},${ty}`), '가운데 선이 그려짐');
  assert.ok(!path.includes(`${tx},${ty}L${mx},${my}`), '가운데 선이 거꾸로 그려짐');
  assert.equal((path.match(/L/g) ?? []).length, 6, '바깥 선분 6개');
});
