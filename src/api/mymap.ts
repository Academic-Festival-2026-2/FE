import { authRequest, request } from "./client";
import type { DongPoint } from "./dong";
import type { TimeBand } from "./map";

export type MyMapCell = {
  dongCode: string;
  name: string;
  timeBand: TimeBand;
  filled: boolean;
  myColor: string | null;
  myPhotoCount: number;
  previewColor: string | null;
};

export type MyMap = {
  season: string;
  totalCellCount: number;
  filledCellCount: number;
  cells: MyMapCell[];
};

// season·regionCode를 빼면 BE 기본값(가을, 부천 3105)
export function getMyMap(params: { season?: string; regionCode?: string } = {}) {
  const query = new URLSearchParams();
  if (params.season) query.set("season", params.season);
  if (params.regionCode) query.set("regionCode", params.regionCode);
  // URLSearchParams.size는 Safari 17부터라 toString()으로 비었는지 확인
  const qs = query.toString();
  const suffix = qs ? `?${qs}` : "";
  return authRequest<MyMap>(`/api/users/me/map${suffix}`);
}

// 나의 지도 공유 (BE #111). shareKey가 null이면 공유 안 하는 중
export type MyMapShare = {
  shareKey: string | null;
};

export function getMyMapShare() {
  return authRequest<MyMapShare>("/api/users/me/map/share");
}

// 공유 켜기: 이미 켜져 있으면 같은 키를 그대로 돌려줌
export function shareMyMap() {
  return authRequest<MyMapShare>("/api/users/me/map/share", { method: "POST" });
}

// 공유 끄기: 키가 지워져서 예전 링크는 더 이상 열리지 않음
export function stopSharingMyMap() {
  return authRequest<void>("/api/users/me/map/share", { method: "DELETE" });
}

// 공유받은 지도 (로그인 없이 열림). 공유를 껐거나 없는 키면 404 MYMAP404_1
// map은 나의 지도 응답과 같은 형식이고, 비공개 사진은 BE에서 빼고 옴
export type SharedMap = {
  nickname: string;
  profileImage: string;
  map: MyMap;
};

export function getSharedMap(shareKey: string, regionCode: string) {
  return request<SharedMap>(
    `/api/shared-maps/${encodeURIComponent(shareKey)}?regionCode=${regionCode}`,
  );
}

export type MyDongPhotos = {
  dongCode: string;
  points: DongPoint[];
};

export function getMyDongPhotos(dongCode: string, timeBand: TimeBand) {
  return authRequest<MyDongPhotos>(`/api/users/me/map/dongs/${dongCode}?timeBand=${timeBand}`);
}
