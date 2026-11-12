import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { analyzePixels, COLOR_HEX } from '../src/pages/photo-upload/color-analysis.ts';
import { parseLocalTime, photoSeasonError, timeBand, validateColors, validateImage, findDong, MAX_IMAGE_BYTES } from '../src/pages/photo-upload/photo-validation.ts';

const pixel = (hex, alpha = 255) => [...[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), alpha];

test('모든 기준색은 자신의 인덱스로 분류되고 API 계약을 만족한다', () => {
  assert.equal(COLOR_HEX.length, 40);
  for (const [index, hex] of COLOR_HEX.entries()) {
    const result = analyzePixels(new Uint8ClampedArray(pixel(hex)));
    assert.equal(result.bins[index], 1);
    assert.deepEqual(result.palette, Array(5).fill(hex));
    assert.deepEqual(result.ratios, [1, 0, 0, 0, 0]);
    assert.ok(validateColors(result.palette, result.bins));
  }
});
test('빈도순·동점 인덱스 순서와 투명도 가중치', () => {
  const result = analyzePixels(new Uint8ClampedArray([
    ...pixel(COLOR_HEX[0]), ...pixel(COLOR_HEX[0]), ...pixel(COLOR_HEX[1]),
    ...pixel(COLOR_HEX[36]), ...pixel(COLOR_HEX[2], 0), ...pixel(COLOR_HEX[37], 128),
  ]));
  assert.deepEqual(result.palette.slice(0, 4), [COLOR_HEX[0], COLOR_HEX[1], COLOR_HEX[36], COLOR_HEX[37]]);
  assert.equal(result.bins[2], 0);
  assert.ok(Math.abs(result.bins[37] / result.bins[1] - 128 / 255) < 1e-12);
  assert.ok(Math.abs(result.bins.reduce((a,b) => a+b, 0) - 1) < 1e-12);
});
test('투명 이미지와 잘못된 색상 데이터 거부', () => {
  assert.throws(() => analyzePixels(new Uint8ClampedArray([0,0,0,0])));
  assert.throws(() => analyzePixels(new Uint8ClampedArray(3)));
  const valid = analyzePixels(new Uint8ClampedArray(pixel(COLOR_HEX[0])));
  assert.equal(validateColors(valid.palette, Array(39).fill(0)), false);
  assert.equal(validateColors(valid.palette, [NaN, ...Array(39).fill(0)]), false);
  assert.equal(validateColors(Array(5).fill('#abcdef'), valid.bins), false);
});
test('KST 로컬 시각 검증과 시간대 경계', () => {
  assert.equal(parseLocalTime('2026:11:07 16:00:00'), '2026-11-07T16:00:00');
  assert.equal(parseLocalTime('2024-02-29T08:00'), '2024-02-29T08:00:00');
  for (const value of ['2026-02-29T12:00', '2026-11-07T24:00', '2026-11-07T12:00:00Z', '2026-11-07T12:00:00+09:00']) assert.equal(parseLocalTime(value), undefined);
  for (const [hour, band] of [[4,'NIGHT'],[5,'DAWN'],[8,'DAY'],[16,'SUNSET'],[19,'NIGHT']]) assert.equal(timeBand(`2026-11-07T${String(hour).padStart(2,'0')}:00`), band);
});
test('등록된 시즌에 해당하지 않는 촬영 날짜를 업로드 전에 안내한다', () => {
  assert.equal(photoSeasonError('2026-09-01T00:00'), undefined);
  assert.equal(photoSeasonError('2026-11-30T23:59'), undefined);
  assert.match(photoSeasonError('2026-08-31T23:59'), /등록된 시즌/);
  assert.match(photoSeasonError('2026-12-01T00:00'), /등록된 시즌/);
  assert.match(photoSeasonError('2026-12-01T00:00'), /2026\.09\.01~2026\.11\.30/);
  assert.equal(photoSeasonError('invalid'), undefined);
});
test('파일 확장자가 아니라 JPEG/PNG 시그니처와 크기를 검사한다', async () => {
  await validateImage(new File([new Uint8Array([255,216,255,0])], 'x.jpg'));
  await validateImage(new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'x.png'));
  await assert.rejects(validateImage(new File(['not image'], 'fake.jpg')));
  await assert.rejects(validateImage(new File([], 'empty.jpg')));
  await assert.rejects(validateImage(new File([new Uint8Array(MAX_IMAGE_BYTES+1)], 'large.jpg')));
});
test('행정동 탐색은 위경도 순서와 내부 구멍을 구분한다', () => {
  const feature = { geometry: { coordinates: [[[[126,37],[128,37],[128,39],[126,39],[126,37]],[[126.5,37.5],[127.5,37.5],[127.5,38.5],[126.5,38.5],[126.5,37.5]]]] } };
  assert.equal(findDong([feature],37.2,126.2),feature);
  assert.equal(findDong([feature],38,127),undefined);
  assert.equal(findDong([feature],40,129),undefined);
});

// Vite 환경 치환과 인증 저장소 mock으로 실제 API 클라이언트와 FormData 생성 함수를 검증합니다.
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
test('실제 업로드 함수의 image/data 파트·JWT·응답·409 오류', async () => {
  const client = moduleUrl((await readFile(new URL('../src/api/client.ts',import.meta.url),'utf8')).replace('import.meta.env.VITE_API_BASE_URL', '""').replace('import { useAuthStore } from "../stores/auth-store";', 'const useAuthStore = { getState: () => ({ tokens: { accessToken: "test-token" } }) };'));
  const photo = moduleUrl((await readFile(new URL('../src/api/photo.ts',import.meta.url),'utf8')).replace('"./client"',JSON.stringify(client)));
  const { uploadPhoto } = await import(photo);
  const original = globalThis.fetch;
  const data = { dongCode:'test-dong', takenAt:'2026-11-07T16:00:00', isPublic:true, ...analyzePixels(new Uint8ClampedArray(pixel(COLOR_HEX[0]))) };
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/photos');
      assert.equal(init.method,'POST');
      assert.equal(init.headers.get('Authorization'),'Bearer test-token');
      assert.equal(init.headers.has('Content-Type'),false);
      assert.deepEqual([...init.body.keys()],['image','data']);
      assert.equal(init.body.get('data').type,'application/json');
      assert.deepEqual(JSON.parse(await init.body.get('data').text()),data);
      return Response.json({isSuccess:true,code:'PHOTO201_1',result:{photoId:1}},{status:201});
    };
    assert.deepEqual(await uploadPhoto(new File(['fixture'],'test.jpg'),data),{photoId:1});
    globalThis.fetch = async () => Response.json({isSuccess:false,code:'PHOTO409_1',message:'중복 사진'},{status:409});
    await assert.rejects(uploadPhoto(new File(['fixture'],'test.jpg'),data),error => error.status===409 && error.code==='PHOTO409_1');
  } finally { globalThis.fetch = original; }
});

// 실제 EXIF 바이너리를 구성합니다. 이미지 디코더는 Node에 없어 이 테스트에서만 대체합니다.
function exifJpeg(withTime, withGps) {
  const tiff = Buffer.alloc(256);
  tiff.write('II'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  const entry = (offset, tag, type, count, value) => {
    tiff.writeUInt16LE(tag, offset); tiff.writeUInt16LE(type, offset + 2);
    tiff.writeUInt32LE(count, offset + 4); tiff.writeUInt32LE(value, offset + 8);
  };
  tiff.writeUInt16LE(Number(withTime) + Number(withGps), 8);
  let offset = 10;
  if (withTime) { entry(offset, 0x8769, 4, 1, 40); offset += 12; }
  if (withGps) entry(offset, 0x8825, 4, 1, 80);
  if (withTime) {
    tiff.writeUInt16LE(1, 40); entry(42, 0x9003, 2, 20, 60);
    tiff.write('2026:11:07 16:30:00\0', 60);
  }
  if (withGps) {
    tiff.writeUInt16LE(4, 80);
    entry(82, 1, 2, 2, 78); entry(94, 2, 5, 3, 140);
    entry(106, 3, 2, 2, 69); entry(118, 4, 5, 3, 164);
    for (const [start, values] of [[140,[37,30,0]], [164,[126,48,0]]]) {
      values.forEach((value,i) => { tiff.writeUInt32LE(value,start+i*8); tiff.writeUInt32LE(1,start+i*8+4); });
    }
  }
  const payload = Buffer.concat([Buffer.from('Exif\0\0'),tiff]);
  const header = Buffer.from([255,216,255,225,0,0]); header.writeUInt16BE(payload.length+2,4);
  return Buffer.concat([header,payload,Buffer.from([255,217])]);
}
test('실제 EXIF 파서로 위치·시각 네 가지 조합을 추출한다', async () => {
  const validation = new URL('../src/pages/photo-upload/photo-validation.ts',import.meta.url).href;
  const exifr = new URL('../node_modules/exifr/dist/full.esm.mjs', import.meta.url).href;
  const source = (await readFile(new URL('../src/pages/photo-upload/photo-metadata.ts',import.meta.url),'utf8'))
    .replace('"exifr"',JSON.stringify(exifr)).replace('"./photo-validation"',JSON.stringify(validation))
    .replace('exifr.parse(file,', 'exifr.parse(await file.arrayBuffer(),');
  const { readPhoto } = await import(moduleUrl(source));
  const original = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => ({close(){}});
  try {
    for (const time of [false,true]) for (const gps of [false,true]) {
      const result = await readPhoto(new File([exifJpeg(time,gps)],'exif.jpg',{type:'image/jpeg'}));
      assert.equal(result.takenAt,time ? '2026-11-07T16:30:00' : undefined);
      assert.equal(result.latitude,gps ? 37.5 : undefined);
      assert.equal(result.longitude,gps ? 126.8 : undefined);
    }
  } finally { globalThis.createImageBitmap = original; }
});
