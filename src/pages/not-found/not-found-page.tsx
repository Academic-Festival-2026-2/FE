import { Link } from "@tanstack/react-router";
import { AuthLayout } from "../../components/layout/auth-layout";
import { currentTimeBand } from "../../utils/time-band";

export function NotFoundPage() {
  return (
    <AuthLayout>
      <h1 className="text-3xl font-extrabold text-ink">페이지를 찾을 수 없어요</h1>
      <p className="mt-3 text-ink-sub">주소가 바뀌었거나 없는 페이지예요.</p>
      <Link
        to="/map"
        search={{ timeBand: currentTimeBand() }}
        className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-brand font-extrabold text-white transition-colors hover:bg-brand-hover"
      >
        처음으로
      </Link>
    </AuthLayout>
  );
}
