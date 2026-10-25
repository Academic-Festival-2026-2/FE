import { Link } from "@tanstack/react-router";

type AuthHeaderProps = {
  // 오른쪽 위에 보여줄 이동 링크
  link: { to: "/login" | "/signup"; label: string };
};

export function AuthHeader({ link }: AuthHeaderProps) {
  return (
    <header className="border-b border-[#e8e4dc]">
      <div className="flex h-16 items-center justify-between px-6 sm:px-12">
        <Link to="/login" className="flex items-center gap-3">
          <span className="grid h-6 w-6 grid-cols-2 gap-0.5" aria-hidden>
            <span className="rounded-[2px] bg-[#ff8a3d]" />
            <span className="rounded-[2px] bg-[#7fb2e5]" />
            <span className="rounded-[2px] bg-[#4b5784]" />
            <span className="rounded-[2px] bg-[#d3d3d6]" />
          </span>
          <span className="text-xl font-extrabold text-gray-900">픽셀</span>
        </Link>
        <Link to={link.to} className="text-sm text-gray-600 underline underline-offset-4 hover:text-gray-900">
          {link.label}
        </Link>
      </div>
    </header>
  );
}
