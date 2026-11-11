import { create } from "zustand";
import { getMyInfo, type MyInfoResponse } from "../api/user";
import { useAuthStore } from "./auth-store";

// 헤더 프로필 메뉴와 마이페이지가 같이 쓰는 내 정보
type UserStore = {
  me: MyInfoResponse | null;
  // 이미 있으면 다시 부르지 않음
  loadMe: () => Promise<void>;
  setMe: (me: MyInfoResponse) => void;
  // 수정 API는 결과를 돌려주지 않아서 보낸 값으로 갱신
  updateMe: (changes: Partial<MyInfoResponse>) => void;
  clearMe: () => void;
};

export const useUserStore = create<UserStore>((set, get) => ({
  me: null,
  loadMe: async () => {
    if (get().me) return;
    const session = useAuthStore.getState().session;
    const me = await getMyInfo();
    // 응답을 기다리는 동안 로그아웃·다른 계정 로그인으로 세션이 바뀌었으면 늦게 온 응답은 버림
    // (토큰 자체를 비교하면 같은 계정의 토큰 재발급에도 버려져서 세션 번호로 비교)
    if (useAuthStore.getState().session === session) set({ me });
  },
  setMe: (me) => set({ me }),
  updateMe: (changes) => set((s) => (s.me ? { me: { ...s.me, ...changes } } : s)),
  clearMe: () => set({ me: null }),
}));

// 로그인·로그아웃·세션 만료·탈퇴로 세션이 바뀌면 내 정보도 비움 (토큰 재발급은 제외)
// (다른 계정으로 다시 로그인했을 때 이전 정보가 보이지 않게)
useAuthStore.subscribe((state, prev) => {
  if (state.session !== prev.session) useUserStore.getState().clearMe();
});
