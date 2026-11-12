import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Boundaries, DongColor } from "../../api/map";
import { predictDongHeightPx } from "./kakao-fit";
import { EMPTY_FILL, PAGE_BG, toneColor } from "./map-data";
import { VIEW_SIZE, toShapes, type DongShape } from "./map-geometry";

const EDGE_WIDTH = 6;
const EDGE_BLUR = 5;
const MIN_VIEW = 90;
// 확대·축소 버튼 (지도 화면의 유리 패널과 같은 톤)
const ZOOM_BUTTON =
  "grid size-8 place-items-center rounded-lg text-ink-sub transition-colors hover:bg-white/60 hover:text-ink";

type View = { x: number; y: number; size: number };

const FULL_VIEW: View = { x: 0, y: 0, size: VIEW_SIZE };
// 동을 눌렀을 때 지도가 화면 전체로 커지며 그 동으로 확대되는 시간 (끝나면 바로 동 상세)
const SELECT_ZOOM_MS = 650;

// 경계 데이터는 화면 이동 후에도 같은 객체를 다시 쓰므로(map-data 캐시) 계산 결과도 저장해 둠
const shapesCache = new WeakMap<Boundaries, DongShape[]>();
function shapesOf(boundaries: Boundaries) {
  let shapes = shapesCache.get(boundaries);
  if (!shapes) {
    shapes = toShapes(boundaries);
    shapesCache.set(boundaries, shapes);
  }
  return shapes;
}

type Props = {
  boundaries: Boundaries;
  dongs: Map<string, DongColor>;
  hoveredCode: string | null;
  onHover: (dongCode: string | null) => void;
  // 동을 누르면 그 동으로 확대한 뒤 호출됨 (동 상세로 이동)
  onSelect: (dongCode: string) => void;
  // 확대를 시작할 때 호출됨 (지도 위 패널을 숨기는 용도)
  onSelectStart?: (dongCode: string) => void;
  // 지금 지도가 보이는 영역(카드). 확대를 시작할 때 이 크기에서 화면 전체로 커짐 (없으면 지도 상자)
  stageRef?: RefObject<HTMLElement | null>;
  tooltip?: ReactNode;
  // 확대·축소 버튼 위치 (지도 위에 다른 패널을 올릴 때 겹치지 않게). 기본은 오른쪽 위
  controlsClassName?: string;
};

function clampView({ x, y, size }: View): View {
  const clamped = Math.min(VIEW_SIZE, Math.max(MIN_VIEW, size));
  return {
    x: Math.min(VIEW_SIZE - clamped * 0.2, Math.max(-clamped * 0.8, x)),
    y: Math.min(VIEW_SIZE - clamped * 0.2, Math.max(-clamped * 0.8, y)),
    size: clamped,
  };
}

function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
}

function zoomAround(view: View, x: number, y: number, factor: number): View {
  const size = Math.min(VIEW_SIZE, Math.max(MIN_VIEW, view.size * factor));
  const ratio = size / view.size;
  return clampView({ x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, size });
}

export function SvgMap({
  boundaries,
  dongs,
  hoveredCode,
  onHover,
  onSelect,
  onSelectStart,
  stageRef,
  tooltip,
  controlsClassName = "top-2 right-2",
}: Props) {
  const shapes = useMemo(() => shapesOf(boundaries), [boundaries]);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // 동으로 확대할 때 매 프레임 직접 바꾸는 흐림 값 (확대해도 화면상 흐림 크기가 그대로이도록)
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const featherRef = useRef<SVGFEGaussianBlurElement>(null);
  const edgeStrokeRef = useRef<SVGGElement>(null);
  const [view, setView] = useState<View>(FULL_VIEW);
  const viewRef = useRef<View>(FULL_VIEW);
  const frameRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const movedRef = useRef(false);
  // 동을 눌러 확대 중인 동 (그동안 다른 클릭·조작 무시, 동 바깥을 동 상세처럼 흐리게)
  const [selecting, setSelecting] = useState<DongShape | null>(null);
  const selectingRef = useRef(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pointerInside, setPointerInside] = useState(false);
  // 동을 눌러 확대 중이면 마우스가 다른 동 위로 지나가도 누른 동을 계속 강조 (강조가 바뀌며 깜빡이지 않게)
  const hovered = selecting ?? shapes.find((shape) => shape.dongCode === hoveredCode);

  const uid = useId();
  const clipId = `${uid}-clip`;
  const blurId = `${uid}-blur`;
  const featherId = `${uid}-feather`;
  const edgesId = `${uid}-edges`;

  function moveTooltip(event: React.PointerEvent<HTMLDivElement>) {
    const tip = tooltipRef.current;
    if (!tip) return;
    const box = event.currentTarget.getBoundingClientRect();
    let x = event.clientX - box.left + 16;
    let y = event.clientY - box.top + 16;
    if (x + tip.offsetWidth > box.width) x -= tip.offsetWidth + 32;
    if (y + tip.offsetHeight > box.height) y -= tip.offsetHeight + 32;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }

  const colorOf = (dongCode: string) => dongs.get(dongCode)?.dominantColor ?? null;
  const fillOf = (dongCode: string) => {
    const color = colorOf(dongCode);
    return color ? toneColor(color) : EMPTY_FILL;
  };

  function applyView(next: View) {
    viewRef.current = next;
    setView(next);
  }

  function animateTo(target: View) {
    cancelAnimationFrame(frameRef.current);
    const to = clampView(target);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyView(to);
      return;
    }
    const from = viewRef.current;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / 320);
      const eased = 1 - (1 - t) ** 3;
      applyView({
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        size: from.size + (to.size - from.size) * eased,
      });
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function zoomBy(factor: number) {
    const current = viewRef.current;
    const center = current.size / 2;
    animateTo(zoomAround(current, current.x + center, current.y + center, factor));
  }

  // 동을 누르면: 지도가 화면 전체로 커지면서, 누른 동을 화면 한가운데로 끌어와 확대.
  // 끝나는 순간 동의 크기·위치가 동 상세(화면 전체 카카오맵)에서 그려질 동과 같아서 바로 넘어가도 이어져 보임.
  function select(shape: DongShape) {
    if (movedRef.current || selectingRef.current) return;
    selectingRef.current = true;
    setSelecting(shape);
    onHover(shape.dongCode);
    onSelectStart?.(shape.dongCode);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onSelect(shape.dongCode);
    };
    const root = rootRef.current;
    const [minX, minY, maxX, maxY] = shape.bounds;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!root || reduceMotion || maxY <= minY) {
      finish();
      return;
    }
    // 탭이 가려지면 애니메이션 프레임이 멈출 수 있어서, 시간이 지나면 확대가 덜 끝났어도 이동
    window.setTimeout(finish, SELECT_ZOOM_MS + 250);

    // 시작: 지금 보이는 지도 영역(카드)과 그 안에서 동이 그려진 위치·크기
    const visible = (stageRef?.current ?? root).getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const current = viewRef.current;
    const startPxPerUnit = Math.min(rootRect.width, rootRect.height) / current.size;
    const dongCenterX = (minX + maxX) / 2;
    const dongCenterY = (minY + maxY) / 2;
    const dongHeight = maxY - minY;
    const from = {
      left: visible.left,
      top: visible.top,
      width: visible.width,
      height: visible.height,
      radius: 20,
      dongX: rootRect.left + rootRect.width / 2 + (dongCenterX - (current.x + current.size / 2)) * startPxPerUnit,
      dongY: rootRect.top + rootRect.height / 2 + (dongCenterY - (current.y + current.size / 2)) * startPxPerUnit,
      dongPx: dongHeight * startPxPerUnit,
    };
    // 끝: 화면 전체, 동은 화면 한가운데에 동 상세와 같은 크기 (kakao-fit.ts)
    const width = window.innerWidth;
    const height = window.innerHeight;
    const to = {
      left: 0,
      top: 0,
      width,
      height,
      radius: 0,
      dongX: width / 2,
      dongY: height / 2,
      dongPx: predictDongHeightPx(shape.latSpan, shape.lngSpan, width, height),
    };

    // 지도 상자를 화면에 고정하고(카드 밖으로 나와 위에 뜸) 매 프레임 크기와 view를 함께 바꿈.
    // 상자 크기와 viewBox를 같은 프레임에 바꿔야 흔들리지 않으므로 React 상태 대신 DOM에 바로 씀
    // (상태로 바꾸면 viewBox가 한 프레임 늦게 들어가서 상자 크기와 어긋나며 떨림)
    const svg = svgRef.current;
    const startSize = current.size;
    root.style.position = "fixed";
    root.style.zIndex = "50";
    root.style.overflow = "hidden";
    root.style.backgroundColor = "#ffffff";

    const lerp = (a: number, b: number, e: number) => a + (b - a) * e;
    let startTime: number | null = null;
    cancelAnimationFrame(frameRef.current);
    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const t = Math.min(1, (now - startTime) / SELECT_ZOOM_MS);
      // 천천히 시작해 천천히 멈춤
      const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const box = {
        left: lerp(from.left, to.left, e),
        top: lerp(from.top, to.top, e),
        width: lerp(from.width, to.width, e),
        height: lerp(from.height, to.height, e),
      };
      root.style.left = `${box.left}px`;
      root.style.top = `${box.top}px`;
      root.style.width = `${box.width}px`;
      root.style.height = `${box.height}px`;
      root.style.borderRadius = `${lerp(from.radius, to.radius, e)}px`;

      // 확대는 배율 기준으로(곱셈) 바꿔야 일정한 속도로 다가오는 느낌이 남
      const dongPx = from.dongPx * (to.dongPx / from.dongPx) ** e;
      const pxPerUnit = dongPx / dongHeight;
      const size = Math.min(box.width, box.height) / pxPerUnit;
      const centerX = dongCenterX - (lerp(from.dongX, to.dongX, e) - (box.left + box.width / 2)) / pxPerUnit;
      const centerY = dongCenterY - (lerp(from.dongY, to.dongY, e) - (box.top + box.height / 2)) / pxPerUnit;
      const next = { x: centerX - size / 2, y: centerY - size / 2, size };
      viewRef.current = next;
      svg?.setAttribute("viewBox", `${next.x} ${next.y} ${next.size} ${next.size}`);
      // 흐림·가장자리 두께는 지도 단위라서 확대할수록 화면에서 엄청 커지고 무거워짐 → 화면상 크기를 유지
      const ratio = size / startSize;
      blurRef.current?.setAttribute("stdDeviation", String(EDGE_BLUR * ratio));
      featherRef.current?.setAttribute("stdDeviation", String((EDGE_WIDTH / 4) * ratio));
      edgeStrokeRef.current?.setAttribute("stroke-width", String(EDGE_WIDTH * ratio));

      if (t < 1) frameRef.current = requestAnimationFrame(step);
      else finish();
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function reset() {
    animateTo(FULL_VIEW);
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimationFrame(frameRef.current);
      const point = toSvgPoint(svg, event.clientX, event.clientY);
      const next = zoomAround(
        viewRef.current,
        point.x,
        point.y,
        event.deltaY > 0 ? 1.15 : 1 / 1.15,
      );
      viewRef.current = next;
      setView(next);
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, []);

  const fills = shapes.map((shape) => (
    <path key={shape.dongCode} d={shape.path} fill={fillOf(shape.dongCode)} fillRule="evenodd" />
  ));

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full"
      onPointerMove={moveTooltip}
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
    >
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`}
        className={`h-full w-full select-none ${selecting ? "pointer-events-none" : ""}`}
        role="group"
        aria-label="부천 동별 대표색 지도"
        onPointerDown={(event) => {
          movedRef.current = false;
          if (event.pointerType === "touch") return;
          dragRef.current = {
            x: event.clientX,
            y: event.clientY,
            view: viewRef.current,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (!drag.moved) {
            if (Math.hypot(dx, dy) < 5) return;
            drag.moved = true;
            movedRef.current = true;
            svg.setPointerCapture(event.pointerId);
            cancelAnimationFrame(frameRef.current);
          }
          const rect = svg.getBoundingClientRect();
          const ratio = drag.view.size / Math.min(rect.width, rect.height);
          applyView(
            clampView({ ...drag.view, x: drag.view.x - dx * ratio, y: drag.view.y - dy * ratio }),
          );
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <defs>
          <clipPath id={clipId}>
            {shapes.map((shape) => (
              <path key={shape.dongCode} d={shape.path} />
            ))}
          </clipPath>
          <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur ref={blurRef} stdDeviation={EDGE_BLUR} />
          </filter>
          <filter id={featherId} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur ref={featherRef} stdDeviation={EDGE_WIDTH / 4} />
          </filter>
          <mask
            id={edgesId}
            maskUnits="userSpaceOnUse"
            x={-100}
            y={-100}
            width={VIEW_SIZE + 200}
            height={VIEW_SIZE + 200}
          >
            <g
              fill="none"
              stroke="#ffffff"
              ref={edgeStrokeRef}
              strokeWidth={EDGE_WIDTH}
              strokeLinejoin="round"
              filter={`url(#${featherId})`}
            >
              {shapes.map((shape) => (
                <path key={shape.dongCode} d={shape.path} />
              ))}
            </g>
          </mask>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <g>
            {shapes.map((shape) => (
              <path
                key={shape.dongCode}
                d={shape.path}
                fill={fillOf(shape.dongCode)}
                fillRule="evenodd"
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-label={shape.name}
                onPointerEnter={() => onHover(shape.dongCode)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(shape.dongCode)}
                onBlur={() => onHover(null)}
                onClick={() => select(shape)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") select(shape);
                }}
              />
            ))}
          </g>
          <g mask={`url(#${edgesId})`} pointerEvents="none">
            <g filter={`url(#${blurId})`}>{fills}</g>
          </g>
        </g>

        <g pointerEvents="none">
          {shapes.map((shape) => (
            <path
              key={shape.dongCode}
              d={shape.path}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.45}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {hovered && (
          <path
            d={`M-1000,-1000H1600V1600H-1000Z${hovered.path}`}
            // 확대 중에는 동 상세 화면처럼 바깥을 회색으로 덮어서 다음 화면과 자연스럽게 이어지게
            fill={selecting ? PAGE_BG : "#ffffff"}
            fillOpacity={selecting ? 0.7 : 0.55}
            fillRule="evenodd"
            pointerEvents="none"
            style={{ transition: `fill ${SELECT_ZOOM_MS}ms, fill-opacity ${SELECT_ZOOM_MS}ms` }}
          />
        )}

        {hovered && (
          <path
            d={hovered.path}
            fill={colorOf(hovered.dongCode) ?? EMPTY_FILL}
            fillRule="evenodd"
            stroke="#ffffff"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

      </svg>

      <div ref={tooltipRef} className="pointer-events-none absolute left-0 top-0 z-10">
        {hoveredCode && pointerInside && !selecting && tooltip}
      </div>

      <div
        className={`liquid-glass absolute flex flex-col gap-0.5 rounded-xl p-1 transition-opacity duration-300 pointer-coarse:hidden ${controlsClassName} ${selecting ? "pointer-events-none opacity-0" : ""}`}
      >
        <button
          type="button"
          aria-label="확대"
          onClick={() => zoomBy(1 / 1.5)}
          className={`${ZOOM_BUTTON} text-lg leading-none`}
        >
          +
        </button>

        <button
          type="button"
          aria-label="축소"
          onClick={() => zoomBy(1.5)}
          className={`${ZOOM_BUTTON} text-lg leading-none`}
        >
          −
        </button>
        <button
          type="button"
          aria-label="처음 크기로"
          onClick={reset}
          className={`${ZOOM_BUTTON} text-[11px] font-bold`}
        >
          전체
        </button>
      </div>
    </div>
  );
}
