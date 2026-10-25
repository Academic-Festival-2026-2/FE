import { create } from "zustand";
import type { TokenResponse } from "../api/auth";

const STORAGE_KEY = "binteum-auth";

// 로그인 상태 유지: localStorage(브라우저를 꺼도 유지), 아니면 sessionStorage(탭을 닫으면 삭제)
function loadTokens(): TokenResponse | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as TokenResponse) : null;
  } catch {
    return null;
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소 접근이 막힌 환경(시크릿 모드 등)은 무시
  }
}

type AuthStore = {
  tokens: TokenResponse | null;
  setTokens: (tokens: TokenResponse, remember: boolean) => void;
  clearTokens: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  tokens: loadTokens(),
  setTokens: (tokens, remember) => {
    clearStorage();
    try {
      (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // 저장에 실패해도 현재 탭에서는 로그인 상태를 유지
    }
    set({ tokens });
  },
  clearTokens: () => {
    clearStorage();
    set({ tokens: null });
  },
}));
