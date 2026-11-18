import chevronDown from "../../assets/icons/chevron-down.svg";
import { COLOR_HEX, COLOR_NAMES, type ColorAnalysis } from "../../features/photo/color-analysis";

// 사진 업로드 화면의 입력 부품 (대표색 후보 고르기, 촬영 위치 시·구·동 선택 칸)

// 업로드 화면 입력칸 공통 모양 (촬영 시각 칸도 같이 씀)
export const FIELD =
  "h-11 w-full rounded-[10px] border border-field-line bg-white px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand";

// 대표색 후보 3개(첫 후보 = 자동 대표색, 처음에 선택됨). 고르면 그 색이 지도에 칠해질 대표색이 됨
export function RepresentativePicker({
  analysis,
  selected,
  disabled,
  onSelect,
}: {
  analysis: ColorAnalysis;
  selected: string;
  disabled: boolean;
  onSelect: (hex: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="픽셀에 찍힐 색 고르기" className="grid grid-cols-3 gap-2.5">
      {analysis.candidates.map((hex) => {
        const checked = hex === selected;
        // 칸 전체를 후보 색으로 채우고 색상 코드는 칸 아래에.
        // 선택된 칸은 검정 테두리(배경색 틈을 두고)로 강조. 선택 안 된 칸도 원래 색 그대로 보여 줌(비교해서 고를 수 있게)
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${COLOR_NAMES[COLOR_HEX.findIndex((c) => c === hex)] ?? hex} (${hex})`}
            disabled={disabled}
            onClick={() => onSelect(hex)}
            className="group flex min-w-0 flex-col gap-2 text-left disabled:cursor-not-allowed"
          >
            <span
              className={`block h-14 w-full rounded-[10px] transition ${checked ? "ring-2 ring-ink ring-offset-2 ring-offset-page" : "ring-1 ring-black/10 group-hover:ring-2 group-hover:ring-black/20 group-disabled:group-hover:ring-1 group-disabled:group-hover:ring-black/10"}`}
              style={{ background: hex }}
              aria-hidden
            />
            <span
              className={`truncate font-mono text-[13px] ${checked ? "font-bold text-ink" : "text-ink-muted"}`}
            >
              {hex}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// 촬영 위치 시·구·동 선택 칸 하나. options: [값, 보이는 이름]
// 안내 문구(빈 값)는 다시 고를 수 없게 막음 → 시를 비우면 구·동 목록을 만들 수 없어요
export function Select({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[][];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-ink-sub">{label}</span>
      <span className="relative block">
        <select
          aria-label={`촬영 위치 ${label}`}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD} appearance-none truncate border-select-line pr-9 disabled:bg-field disabled:text-ink-faint`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map(([optionValue, name]) => (
            <option key={optionValue} value={optionValue}>
              {name}
            </option>
          ))}
        </select>
        <img
          src={chevronDown}
          alt=""
          width={16}
          height={16}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        />
      </span>
    </label>
  );
}
