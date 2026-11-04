import { AuthLayout } from "../../components/layout/auth-layout";
import { useLogout } from "../../hooks/use-logout";

export function HomePage() {
  const { logout, isLoggingOut } = useLogout();

  return (
    <AuthLayout>
      <h1 className="text-3xl font-extrabold text-gray-900">로그인되었어요</h1>
      <p className="mt-3 text-gray-600">픽셀의 다른 기능은 준비 중이에요.</p>
      <button
        type="button"
        onClick={logout}
        disabled={isLoggingOut}
        className="mt-8 h-12 w-full rounded-xl border border-[#ddd8ce] bg-white text-gray-900 transition-colors hover:bg-[#f7f5f0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </AuthLayout>
  );
}
