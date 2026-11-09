import { Link } from "@tanstack/react-router";
import { AuthLayout } from "../../components/layout/auth-layout";

export function NotFoundPage() {
  return (
    <AuthLayout>
      <h1 className="text-3xl font-extrabold text-gray-900">페이지를 찾을 수 없어요</h1>
      <p className="mt-3 text-gray-600">주소가 바뀌었거나 없는 페이지예요.</p>
      <Link
        to="/"
        className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-[#ff8a3d] font-bold text-gray-900 transition-colors hover:bg-[#f57a2a]"
      >
        처음으로
      </Link>
    </AuthLayout>
  );
}
