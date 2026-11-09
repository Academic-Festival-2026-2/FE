import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApiError } from "../../api/client";
import { withdraw } from "../../api/user";
import { TextField } from "../../components/form/text-field";
import { isSessionExpired, useExpireSession } from "../../hooks/use-expire-session";
import { useAuthStore } from "../../stores/auth-store";

type WithdrawDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function WithdrawDialog({ open, onClose }: WithdrawDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const expireSession = useExpireSession();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // open 값에 맞춰 모달 열고 닫기(showModal: ESC 닫기, 배경 어둡게, 뒤쪽 클릭 막기 기본 제공)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // 취소 버튼, ESC 모두 close 이벤트로 여기에 들어옴
  function handleClose() {
    setPassword("");
    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password === "" || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await withdraw(password);
      clearTokens();
      navigate({ to: "/login", search: { withdrawn: true } });
    } catch (error) {
      if (isSessionExpired(error)) return expireSession();
      // USER400_1(비밀번호 불일치)은 서버 문구 그대로
      if (error instanceof ApiError) setError(error.fieldErrors?.password ?? error.message);
      else setError("탈퇴하지 못했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="withdraw-title"
      onClose={handleClose}
      // ESC: 기본 닫기 대신 직접 close() 호출(일부 브라우저에서 ESC로 닫으면 close 이벤트가 안 와서
      // 입력값 초기화·부모 상태 갱신이 빠지는 문제가 있음). 요청 중에는 닫지 않음
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) dialogRef.current?.close();
      }}
      // Tailwind 기본 스타일이 margin을 0으로 만들어서 m-auto로 가운데 정렬
      className="m-auto w-[min(420px,calc(100%-32px))] rounded-3xl bg-white p-6 backdrop:bg-black/40"
    >
      <p className="font-mono text-xs tracking-[0.15em] text-[#c4581a]">WITHDRAW</p>
      <h2 id="withdraw-title" className="mt-1 text-xl font-extrabold text-gray-900">
        정말 탈퇴할까요?
      </h2>
      <ul className="mt-4 list-disc rounded-xl bg-[#f2f0eb] py-3 pr-4 pl-8 text-[13px] leading-relaxed text-gray-700">
        <li>이메일과 닉네임은 바로 지워져요. 같은 이메일로 다시 가입할 수 있어요.</li>
        <li>올린 사진과 지도에 칠한 색은 남아요.</li>
        <li>탈퇴하면 되돌릴 수 없어요.</li>
      </ul>

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="withdrawPassword"
          size="sm"
          label="비밀번호 확인"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호를 입력해 주세요"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setError(null);
          }}
          error={error}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => dialogRef.current?.close()}
            className="h-11 rounded-[10px] border border-[#ddd8ce] bg-white text-sm text-gray-900 transition-colors hover:bg-[#f7f5f0] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={password === "" || isSubmitting}
            className="h-11 rounded-[10px] bg-[#a8321f] text-sm font-bold text-white transition-colors hover:bg-[#932a19] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "탈퇴 중..." : "탈퇴하기"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
