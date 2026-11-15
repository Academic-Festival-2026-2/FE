import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ApiError } from "../../api/client";
import { getLikedPhotos, type LikedPhotoItem } from "../../api/photo";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { currentTimeBand } from "../../utils/time-band";
import { MYPAGE_SECTION } from "./mypage-sections";
import { PhotoTile } from "./photo-tile";
import { SectionCard } from "./section-card";

// 최근에 좋아요한 사진 6장 (내 사진 영역과 같은 칸 크기, 업로드 칸 자리까지 사진)
const PREVIEW_COUNT = 6;

export function LikedPhotosSection() {
  const expireSession = useExpireSession();
  const [photos, setPhotos] = useState<LikedPhotoItem[] | null>(null);
  const [error, setError] = useState(false);
  // 좋아요 API가 없는 BE(좋아요 기능 배포 전, 404)면 영역을 통째로 숨김
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    let ignore = false;
    getLikedPhotos(0, PREVIEW_COUNT)
      .then((result) => {
        if (!ignore) setPhotos(result.photos);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        if (isSessionExpired(err)) expireSession();
        else if (err instanceof ApiError && err.status === 404) setUnsupported(true);
        else setError(true);
      });
    return () => {
      ignore = true;
    };
  }, [expireSession]);

  if (unsupported) return null;

  return (
    <SectionCard
      id={MYPAGE_SECTION.likes}
      title="좋아요 표시한 사진"
      aside={
        photos && photos.length > 0 ? (
          <Link to="/mypage/likes" className="text-sm font-bold text-brand-strong hover:text-brand">
            전체 보기 ›
          </Link>
        ) : null
      }
    >
      {error && <p className="mt-4 text-sm text-danger">좋아요한 사진을 불러오지 못했어요.</p>}
      {!photos && !error && <p className="mt-4 text-sm text-ink-muted">불러오는 중...</p>}
      {photos && photos.length === 0 && (
        <p className="mt-4 text-sm leading-[22px] text-ink-sub">
          아직 좋아요한 사진이 없어요.
          <br />
          지도에서 마음에 드는 사진의 하트를 눌러 보세요.{" "}
          <Link
            to="/map"
            search={{ timeBand: currentTimeBand() }}
            className="font-bold text-brand-strong underline underline-offset-4 hover:text-brand"
          >
            지도 둘러보기
          </Link>
        </p>
      )}
      {photos && photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.map((photo) => (
            <li key={photo.photoId}>
              {/* 누르면 좋아요한 사진 모아보기 (크게 보기는 거기서) */}
              <PhotoTile
                to="/mypage/likes"
                thumbnailUrl={photo.thumbnailUrl}
                color={photo.color}
                label={`${photo.nickname}님이 ${photo.name}에서 찍은 사진, 좋아요한 사진 모아보기로 이동`}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
