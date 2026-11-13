import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getMyPhotos, type MyPhotoItem } from "../../api/photo";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { MYPAGE_SECTION } from "./mypage-sections";
import { SectionCard } from "./section-card";

// 최근 사진 5장 + 마지막 칸은 사진 업로드
const PREVIEW_COUNT = 5;

function RecentPhoto({ photo }: { photo: MyPhotoItem }) {
  const [failed, setFailed] = useState(false);
  // 다 받기 전에는 감춰서 받는 중·실패 때 깨진 이미지 아이콘이 보이지 않게 (그동안은 사진 대표색)
  const [loaded, setLoaded] = useState(false);
  return (
    // 누르면 내 사진 모아보기 (상세는 거기서)
    <Link
      to="/mypage/photos"
      aria-label={`${photo.name}에서 촬영한 사진, 내 사진 모아보기로 이동`}
      className="block aspect-square overflow-hidden rounded-[10px] transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      // 썸네일이 없거나 받는 중이면 사진 대표색
      style={{ backgroundColor: photo.color }}
    >
      {photo.thumbnailUrl && !failed && (
        <img
          src={photo.thumbnailUrl}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </Link>
  );
}

function UploadTile({ label }: { label: string }) {
  return (
    <Link
      to="/upload"
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#c5ccda] text-center text-xs font-bold text-ink-sub transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-strong"
    >
      <span aria-hidden className="text-xl leading-none font-normal">
        +
      </span>
      {label}
    </Link>
  );
}

export function RecentPhotosSection() {
  const expireSession = useExpireSession();
  const [photos, setPhotos] = useState<MyPhotoItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    getMyPhotos(0, PREVIEW_COUNT)
      .then((result) => {
        if (!ignore) setPhotos(result.photos);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        if (isSessionExpired(err)) expireSession();
        else setError(true);
      });
    return () => {
      ignore = true;
    };
  }, [expireSession]);

  const isEmpty = photos !== null && photos.length === 0;

  return (
    <SectionCard
      id={MYPAGE_SECTION.photos}
      title="내 사진"
      aside={
        photos && photos.length > 0 ? (
          <Link to="/mypage/photos" className="text-sm font-bold text-brand-strong hover:text-brand">
            전체 보기 ›
          </Link>
        ) : null
      }
    >
      {/* 목록을 못 받아도 업로드는 할 수 있게 (마이페이지 헤더엔 업로드 버튼이 없음) */}
      {error && (
        <div className="mt-4 flex items-center gap-4">
          <div className="w-24 shrink-0">
            <UploadTile label="사진 업로드" />
          </div>
          <p className="text-sm text-danger">사진을 불러오지 못했어요.</p>
        </div>
      )}
      {!photos && !error && <p className="mt-4 text-sm text-ink-muted">불러오는 중...</p>}
      {isEmpty && (
        <div className="mt-4 flex items-center gap-4">
          <div className="w-24 shrink-0">
            <UploadTile label="사진 업로드" />
          </div>
          <p className="text-sm leading-[22px] text-ink-sub">
            아직 올린 사진이 없어요.
            <br />
            사진 한 장이 지도에 픽셀 하나가 돼요.
          </p>
        </div>
      )}
      {photos && photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.map((photo) => (
            <li key={photo.photoId}>
              <RecentPhoto photo={photo} />
            </li>
          ))}
          <li>
            <UploadTile label="사진 업로드" />
          </li>
        </ul>
      )}
    </SectionCard>
  );
}
