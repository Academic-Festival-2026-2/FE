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
    set({ me: await getMyInfo() });
  },
  setMe: (me) => set({ me }),
  updateMe: (changes) => set((s) => (s.me ? { me: { ...s.me, ...changes } } : s)),
  clearMe: () => set({ me: null }),
}));

// 로그아웃·세션 만료·탈퇴 등으로 토큰이 지워지면 내 정보도 비움
// (다른 계정으로 다시 로그인했을 때 이전 정보가 보이지 않게)
useAuthStore.subscribe((state) => {
  if (!state.tokens) useUserStore.getState().clearMe();
});
