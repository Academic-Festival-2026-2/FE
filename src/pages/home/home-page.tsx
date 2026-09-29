export function HomePage() {
  return (
    <main className="mx-auto flex h-screen max-w-md flex-col bg-white shadow-sm border-x border-gray-100 relative">
      {/* 본문 스크롤 영역 (하단 네비게이션 공간 확보를 위해 pb-20 적용) */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* 상단 헤더 영역 */}
        <div className="px-6 pt-12 pb-6">
          <p className="text-sm font-medium text-gray-500">가톨릭대학교 성심교정</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">빈 강의실 찾기</h1>

          <div className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-[#f0f8f1] px-4 py-2.5 text-sm font-medium text-[#2d944c]">
            <div className="h-2 w-2 rounded-full bg-[#2d944c]"></div>
            실시간 · 목요일 15:26 · 106개 빈 강의실
          </div>
        </div>

        {/* 건물별 현황 리스트 (포인트/광고 배너 영역 제거됨) */}
        <div className="px-6 pt-4">
          <h2 className="mb-6 text-lg font-bold text-gray-900">건물별 현황</h2>

          <div className="flex flex-col gap-8">
            {/* 첫 번째 건물 */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">니콜스관</h3>
                  <p className="mt-0.5 text-xs text-gray-400">강의실 50개</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#2d944c]">17</p>
                  <p className="text-xs text-gray-400">빈 강의실</p>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-orange-400" style={{ width: '34%' }}></div>
              </div>
            </div>

            {/* 두 번째 건물 */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">마리아관</h3>
                  <p className="mt-0.5 text-xs text-gray-400">강의실 46개</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#2d944c]">15</p>
                  <p className="text-xs text-gray-400">빈 강의실</p>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: '32%' }}></div>
              </div>
            </div>

            {/* 세 번째 건물 */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">다솔관</h3>
                  <p className="mt-0.5 text-xs text-gray-400">강의실 44개</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#2d944c]">23</p>
                  <p className="text-xs text-gray-400">빈 강의실</p>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[#2d944c]" style={{ width: '52%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}