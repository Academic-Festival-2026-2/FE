import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { Boundaries, DongColor } from "../../api/map";
import { predictDongHeightPx } from "./kakao-fit";
import { EMPTY_FILL, PAGE_BG, toneColor } from "./map-data";
import {
  WORLD_HEIGHT, WORLD_WIDTH, toShapes,
  type DongShape, type View, MAX_VIEW_SCALE
} from "./map-geometry";

const EDGE_WIDTH = 6;
const EDGE_BLUR = 5;
const MIN_VIEW = 90;
// 확대·축소 버튼 (지도 화면의 유리 패널과 같은 톤)
// 시간대·계절·지도 종류를 바꿀 때 동 색이 서서히 바뀌게 (fill을 CSS로 줘야 전환됨, 동작 줄이기면 즉시)
const FILL_TRANSITION = "transition-[fill] duration-500 ease-out motion-reduce:transition-none";
// 색이 왼쪽 동부터 오른쪽 동으로 번져 나가듯 바뀌게, 가장 오른쪽 동이 늦게 시작하는 시간(ms)
const FILL_WAVE_MS = 220;

const ZOOM_BUTTON =
  "grid size-8 place-items-center rounded-lg text-ink-sub transition-colors hover:bg-white/60 hover:text-ink";

// 동을 눌렀을 때 지도가 화면 전체로 커지며 그 동으로 확대되는 시간 (끝나면 바로 동 상세).
// 동 상세에서 돌아올 때 화면 전체에서 카드로 줄어드는 시간도 같음
const STAGE_MS = 650;
// 돌아올 때: 천천히 시작해 천천히 멈춤
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
// 들어갈 때: 위(끝에서 멈춤)와 점점 빨라지기(t²)의 중간. 끝에서 완전히 멈추지 않고 적당한 속도로 동 상세에 이어짐
// ZOOM_IN_MIX를 0에 가깝게 하면 끝에서 더 멈추고, 1에 가깝게 하면 더 쭉 파고듦
const ZOOM_IN_MIX = 0.5;
const easeZoomIn = (t: number) => (1 - ZOOM_IN_MIX) * easeInOut(t) + ZOOM_IN_MIX * t * t;
// 지도 카드 모서리 (map-page의 rounded-[20px]과 같음)
const CARD_RADIUS = 20;
// 동 바깥 덮개 진하기: 마우스를 올렸을 때 / 동 상세와 같은 진하기
const HOVER_DIM = 0.55;
const FOCUS_DIM = 0.7;

const lerp = (a: number, b: number, e: number) => a + (b - a) * e;

// 애니메이션 한쪽 끝의 모습: 지도 상자 위치·크기·모서리, 동 가운데의 화면 좌표와 세로 길이(px), 동 바깥 덮개 진하기
type StageFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  dongX: number;
  dongY: number;
  dongPx: number;
  dim: number;
};

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
  // 지금 받아 둔 지역들의 경계 (화면에 보이는 지역만 부모가 넘김)
  regions: Boundaries[];
  // 처음 보여 줄 화면 (첫 지역이 꽉 차게). "전체" 버튼과 동 상세에서 돌아올 때도 이 화면으로
  homeView: View;
  // 화면 이동이 멈추면 (마지막 움직임 0.2초 뒤) 지금 화면을 알려 줌. 보이는 지역을 받는 데 씀
  onViewChange?: (view: View) => void;
  dongs: Map<string, DongColor>;
  hoveredCode: string | null;
  onHover: (dongCode: string | null) => void;
  // 동을 누르면 그 동으로 확대한 뒤 호출됨 (동 상세로 이동)
  onSelect: (dongCode: string) => void;
  // 확대를 시작할 때 호출됨 (지도 위 패널을 숨기는 용도)
  onSelectStart?: (dongCode: string) => void;
  // 지금 지도가 보이는 영역(카드). 확대를 시작할 때 이 크기에서 화면 전체로 커짐 (없으면 지도 상자)
  stageRef?: RefObject<HTMLElement | null>;
  // 동 상세에서 돌아온 경우 그 동 코드. 있으면 화면 전체에서 카드로 줄어들며 시작
  returnFrom?: string | null;
  // 돌아오는 애니메이션이 끝났을 때 (지도 위 패널을 다시 보이게)
  onReturnEnd?: () => void;
  tooltip?: ReactNode;
  // 확대·축소 버튼 위치 (지도 위에 다른 패널을 올릴 때 겹치지 않게). 기본은 오른쪽 위
  controlsClassName?: string;
  // 색이 바뀔 때 번져 나가는 방향 (탭 표시가 움직인 방향과 같게). 기본은 왼쪽 → 오른쪽
  fillWave?: "ltr" | "rtl";
};

function clampView({ x, y, size }: View, maxSize: number): View {
  const clamped = Math.min(maxSize, Math.max(MIN_VIEW, size));
  // 화면 가운데가 경기도 범위 밖으로 나가지 않게
  return {
    x: Math.min(WORLD_WIDTH - clamped / 2, Math.max(-clamped / 2, x)),
    y: Math.min(WORLD_HEIGHT - clamped / 2, Math.max(-clamped / 2, y)),
    size: clamped,
  };
}

function zoomAround(view: View, x: number, y: number, factor: number, maxSize: number): View {
  const size = Math.min(maxSize, Math.max(MIN_VIEW, view.size * factor));
  const ratio = size / view.size;
  return clampView({ x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, size }, maxSize);
}

function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
}

export function SvgMap({
  regions,
  homeView,
  onViewChange,
  dongs,
  hoveredCode,
  onHover,
  onSelect,
  onSelectStart,
  stageRef,
  returnFrom,
  onReturnEnd,
  tooltip,
  controlsClassName = "top-2 right-2",
  fillWave = "ltr",
}: Props) {
  const maxSize = homeView.size * MAX_VIEW_SCALE;
  const shapes = useMemo(() => regions.flatMap(shapesOf), [regions]);

  // 동마다 색 전환 시작을 늦추는 시간 (동 가운데의 가로 위치 기준)
  // ltr: 왼쪽 동 0ms → 오른쪽 동 FILL_WAVE_MS / rtl: 반대
  const fillDelays = useMemo(() => {
    const centers = shapes.map((shape) => (shape.bounds[0] + shape.bounds[2]) / 2);
    const left = Math.min(...centers);
    const width = Math.max(...centers) - left || 1;
    return new Map(
      shapes.map((shape, i) => {
        const ratio = (centers[i] - left) / width;
        const order = fillWave === "ltr" ? ratio : 1 - ratio;
        return [shape.dongCode, `${Math.round(order * FILL_WAVE_MS)}ms`];
      }),
    );
  }, [shapes, fillWave]);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // 확대·축소 애니메이션 동안 잠깐 끄는 무거운 레이어 (가장자리 흐림, 부천 모양 자르기)
  const edgeGroupRef = useRef<SVGGElement>(null);
  const clipGroupRef = useRef<SVGGElement>(null);
  const focusOverlayRef = useRef<SVGPathElement>(null);
  const [view, setView] = useState<View>(homeView);
  const viewRef = useRef<View>(homeView);
  // 화면 이동이 0.2초 멈추면 한 번만 알림 (드래그 중 매 프레임 알리지 않게)
  useEffect(() => {
    if (!onViewChange) return;
    const timer = window.setTimeout(() => onViewChange(view), 200);
    return () => window.clearTimeout(timer);
  }, [view, onViewChange]);
  const frameRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const movedRef = useRef(false);
  // 동 상세에서 돌아온 동 (처음 그릴 때부터 그 동을 강조한 상태로 시작)
  const [returnShape] = useState(() =>
    returnFrom ? (shapes.find((shape) => shape.dongCode === returnFrom) ?? null) : null,
  );
  const [returning, setReturning] = useState(returnShape !== null);
  // 동을 눌러 확대 중이거나 돌아오는 중인 동 (그동안 다른 클릭·조작 무시, 동 바깥을 회색으로 덮음)
  const [selecting, setSelecting] = useState<DongShape | null>(returnShape);
  const selectingRef = useRef(returnShape !== null);

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
    const to = clampView(target, maxSize);
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
    animateTo(zoomAround(current, current.x + center, current.y + center, factor, maxSize));
  }

  // 지도 상자(root)를 화면에 고정해 두고, 상자 위치·크기와 동의 화면상 위치·크기를 함께 옮기는 애니메이션.
  // 동으로 들어갈 때(카드 → 화면 전체)와 돌아올 때(화면 전체 → 카드) 둘 다 씀.
  // 상자 크기와 viewBox를 같은 프레임에 바꿔야 흔들리지 않으므로 React 상태 대신 DOM에 바로 씀
  // (상태로 바꾸면 viewBox가 한 프레임 늦게 들어가서 상자 크기와 어긋나며 떨림)
  function runStage(
    shape: DongShape,
    from: StageFrame,
    to: StageFrame,
    onDone: () => void,
    ease: (t: number) => number = easeInOut,
  ) {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) {
      onDone();
      return;
    }
    const [minX, minY, maxX, maxY] = shape.bounds;
    const dongCenterX = (minX + maxX) / 2;
    const dongCenterY = (minY + maxY) / 2;
    const dongHeight = maxY - minY;
    const overlay = focusOverlayRef.current;

    root.style.position = "fixed";
    root.style.zIndex = "50";
    root.style.overflow = "hidden";
    root.style.backgroundColor = "#ffffff";
    // 렉 줄이기: 가장자리 흐림(가우시안 블러 + 마스크)과 부천 모양 자르기(clip-path)는 viewBox가 바뀔 때마다
    // 지도 전체를 다시 계산해서 가장 무거움. 움직이는 동안에는 차이가 거의 안 보이므로 꺼 두고 끝나면 되돌림
    edgeGroupRef.current?.style.setProperty("display", "none");
    clipGroupRef.current?.removeAttribute("clip-path");

    const draw = (e: number) => {
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

      // 확대는 배율 기준으로(곱셈) 바꿔야 일정한 속도로 다가오거나 멀어지는 느낌이 남
      const dongPx = from.dongPx * (to.dongPx / from.dongPx) ** e;
      const pxPerUnit = dongPx / dongHeight;
      const size = Math.min(box.width, box.height) / pxPerUnit;
      const centerX = dongCenterX - (lerp(from.dongX, to.dongX, e) - (box.left + box.width / 2)) / pxPerUnit;
      const centerY = dongCenterY - (lerp(from.dongY, to.dongY, e) - (box.top + box.height / 2)) / pxPerUnit;
      const next = { x: centerX - size / 2, y: centerY - size / 2, size };
      viewRef.current = next;
      svg.setAttribute("viewBox", `${next.x} ${next.y} ${next.size} ${next.size}`);
      // 동 바깥 회색 덮개 (동 상세와 같은 색·진하기)
      overlay?.setAttribute("fill-opacity", String(lerp(from.dim, to.dim, e)));
    };

    draw(0);
    let startTime: number | null = null;
    cancelAnimationFrame(frameRef.current);
    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const t = Math.min(1, (now - startTime) / STAGE_MS);
      draw(ease(t));
      if (t < 1) frameRef.current = requestAnimationFrame(step);
      else onDone();
    };
    frameRef.current = requestAnimationFrame(step);
  }

  // 지도 상자를 원래(카드 안) 상태로 되돌림
  function clearStage() {
    const root = rootRef.current;
    if (root) {
      for (const name of ["position", "zIndex", "overflow", "backgroundColor", "left", "top", "width", "height", "borderRadius"] as const) {
        root.style[name] = "";
      }
    }
    edgeGroupRef.current?.style.removeProperty("display");
    clipGroupRef.current?.setAttribute("clip-path", `url(#${clipId})`);
    viewRef.current = homeView;
    svgRef.current?.setAttribute("viewBox", `${homeView.x} ${homeView.y} ${homeView.size} ${homeView.size}`);
  }

  // 화면 전체(동 상세와 같은 모습): 동이 화면 한가운데에 동 상세와 같은 크기 (kakao-fit.ts)
  function fullscreenFrame(shape: DongShape): StageFrame {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      left: 0,
      top: 0,
      width,
      height,
      radius: 0,
      dongX: width / 2,
      dongY: height / 2,
      dongPx: predictDongHeightPx(shape.latSpan, shape.lngSpan, width, height),
      dim: FOCUS_DIM,
    };
  }

  // 카드 안: 보이는 영역(카드)과 view 상태에서 동이 그려지는 위치·크기. rootRect는 상자가 카드 안에 있을 때의 크기
  function cardFrame(shape: DongShape, rootRect: DOMRect, current: View, dim: number): StageFrame {
    const root = rootRef.current;
    const visible = stageRef?.current?.getBoundingClientRect() ?? rootRect;
    const [minX, minY, maxX, maxY] = shape.bounds;
    const pxPerUnit = Math.min(rootRect.width, rootRect.height) / current.size;
    return {
      left: visible.left,
      top: visible.top,
      width: visible.width,
      height: visible.height,
      radius: root ? CARD_RADIUS : 0,
      dongX: rootRect.left + rootRect.width / 2 + ((minX + maxX) / 2 - (current.x + current.size / 2)) * pxPerUnit,
      dongY: rootRect.top + rootRect.height / 2 + ((minY + maxY) / 2 - (current.y + current.size / 2)) * pxPerUnit,
      dongPx: (maxY - minY) * pxPerUnit,
      dim,
    };
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!root || reduceMotion || shape.bounds[3] <= shape.bounds[1]) {
      finish();
      return;
    }
    // 탭이 가려지면 애니메이션 프레임이 멈출 수 있어서, 시간이 지나면 확대가 덜 끝났어도 이동
    window.setTimeout(finish, STAGE_MS + 250);

    const rootRect = root.getBoundingClientRect();
    const current = viewRef.current;
    const from = cardFrame(shape, rootRect, current, HOVER_DIM);
    runStage(shape, from, fullscreenFrame(shape), finish, easeZoomIn);
  }

  // 동 상세에서 돌아왔으면: 동 상세와 같은 모습(화면 전체)에서 시작해 카드 안 전체 지도로 줄어듦.
  // 그리기 전에 시작 모습으로 맞춰야 하므로 useLayoutEffect
  useLayoutEffect(() => {
    const shape = returnShape;
    const root = rootRef.current;
    if (!shape || !root) {
      // 돌아온 동을 못 찾았으면 애니메이션 없이 바로 평소 화면
      if (returnFrom) onReturnEnd?.();
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const to = cardFrame(shape, rootRect, homeView, 0);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearStage();
      selectingRef.current = false;
      setSelecting(null);
      setReturning(false);
      onReturnEnd?.();
    };
    const timer = window.setTimeout(finish, STAGE_MS + 250);
    runStage(shape, fullscreenFrame(shape), to, finish);
    return () => {
      // 개발 모드(StrictMode)에서 effect가 한 번 더 실행될 때를 위해 정리
      window.clearTimeout(timer);
      cancelAnimationFrame(frameRef.current);
      if (!finished) clearStage();
    };
    // 처음 그릴 때 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    animateTo(homeView);
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
        maxSize
      );
      viewRef.current = next;
      setView(next);
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [maxSize]);

  const fills = shapes.map((shape) => (
    <path
      key={shape.dongCode}
      d={shape.path}
      style={{ fill: fillOf(shape.dongCode), transitionDelay: fillDelays.get(shape.dongCode) }}
      fillRule="evenodd"
      className={FILL_TRANSITION}
    />
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
        aria-label="동별 대표색 지도"
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
            clampView(
              { ...drag.view, x: drag.view.x - dx * ratio, y: drag.view.y - dy * ratio,}, maxSize),
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
            <feGaussianBlur stdDeviation={EDGE_BLUR} />
          </filter>
          <filter id={featherId} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={EDGE_WIDTH / 4} />
          </filter>
          <mask
            id={edgesId}
            maskUnits="userSpaceOnUse"
            x={-100}
            y={-100}
            width={WORLD_WIDTH + 200}
            height={WORLD_HEIGHT + 200}
          >
            <g
              fill="none"
              stroke="#ffffff"
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

        <g ref={clipGroupRef} clipPath={`url(#${clipId})`}>
          <g>
            {shapes.map((shape) => (
              <path
                key={shape.dongCode}
                d={shape.path}
                style={{
                  fill: fillOf(shape.dongCode),
                  transitionDelay: fillDelays.get(shape.dongCode),
                }}
                fillRule="evenodd"
                className={`cursor-pointer outline-none ${FILL_TRANSITION}`}
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
          <g ref={edgeGroupRef} mask={`url(#${edgesId})`} pointerEvents="none">
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
            ref={focusOverlayRef}
            d={`M-1000,-1000H${WORLD_WIDTH + 1000}V${WORLD_HEIGHT + 1000}H-1000Z${hovered.path}`}
            // 동을 누르거나 돌아오는 중에는 동 상세처럼 바깥을 회색으로 덮고, 진하기는 애니메이션이 매 프레임 바꿈
            fill={selecting ? PAGE_BG : "#ffffff"}
            fillOpacity={selecting ? (returning ? FOCUS_DIM : HOVER_DIM) : HOVER_DIM}
            fillRule="evenodd"
            pointerEvents="none"
          />
        )}

        {hovered && (
          <path
            d={hovered.path}
            style={{ fill: colorOf(hovered.dongCode) ?? EMPTY_FILL }}
            fillRule="evenodd"
            className={FILL_TRANSITION}
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
        className={`liquid-glass absolute flex flex-col gap-0.5 rounded-xl p-1 transition-opacity duration-300 pointer-coarse:hidden ${controlsClassName} ${selecting ? "invisible" : ""}`}
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
