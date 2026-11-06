import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { Boundaries, DongColor } from "../../api/map";
import { EMPTY_FILL, toneColor } from "./map-data";
import { VIEW_SIZE, toShapes, type DongShape } from "./map-geometry";

const EDGE_WIDTH = 6;
const EDGE_BLUR = 5;
const MIN_VIEW = 90;
const LABEL_MIN_AREA = 900;

type View = { x: number; y: number; size: number };

const FULL_VIEW: View = { x: 0, y: 0, size: VIEW_SIZE };

type Props = {
  boundaries: Boundaries;
  dongs: Map<string, DongColor>;
  hoveredCode: string | null;
  onHover: (dongCode: string | null) => void;
  onSelect: (dongCode: string) => void;
  tooltip?: ReactNode;
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
                         tooltip,
                       }: Props) {
  const shapes = useMemo(() => toShapes(boundaries), [boundaries]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(FULL_VIEW);
  const viewRef = useRef<View>(FULL_VIEW);
  const frameRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const movedRef = useRef(false);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pointerInside, setPointerInside] = useState(false);
  const hovered = shapes.find((shape) => shape.dongCode === hoveredCode);

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
  const scale = view.size / VIEW_SIZE;

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

  function select(shape: DongShape) {
    if (movedRef.current) return;
    onSelect(shape.dongCode);
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
      const next = zoomAround(viewRef.current, point.x, point.y, event.deltaY > 0 ? 1.15 : 1 / 1.15);
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
        className="relative h-full w-full"
        onPointerMove={moveTooltip}
        onPointerEnter={() => setPointerInside(true)}
        onPointerLeave={() => setPointerInside(false)}
      >
        <svg
            ref={svgRef}
            viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`}
            className="h-full w-full touch-none select-none"
            role="img"
            aria-label="부천 동별 대표색 지도"
            onPointerDown={(event) => {
              dragRef.current = { x: event.clientX, y: event.clientY, view: viewRef.current, moved: false };
              movedRef.current = false;
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
              applyView(clampView({ ...drag.view, x: drag.view.x - dx * ratio, y: drag.view.y - dy * ratio }));
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
                width={VIEW_SIZE + 200}
                height={VIEW_SIZE + 200}
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
                        if (event.key === "Enter") onSelect(shape.dongCode);
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
                  fill="#ffffff"
                  fillOpacity={0.55}
                  fillRule="evenodd"
                  pointerEvents="none"
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

          <g pointerEvents="none">
            {shapes
            .filter((shape) => shape.area / (scale * scale) > LABEL_MIN_AREA)
            .map((shape) => (
                <text
                    key={shape.dongCode}
                    x={shape.label[0]}
                    y={shape.label[1]}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8.5 * scale}
                    fontWeight={700}
                    fill="#3d3830"
                    stroke="#ffffff"
                    strokeWidth={2.4 * scale}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                >
                  {shape.name}
                </text>
            ))}
          </g>
        </svg>

        <div ref={tooltipRef} className="pointer-events-none absolute left-0 top-0 z-10">
          {hoveredCode && pointerInside && tooltip}
        </div>

        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
              type="button"
              aria-label="확대"
              onClick={() => zoomBy(1 / 1.5)}
              className="h-9 w-9 rounded-lg bg-white/90 text-lg text-gray-900 shadow"
          >
            +
          </button>

          <button
              type="button"
              aria-label="축소"
              onClick={() => zoomBy(1.5)}
              className="h-9 w-9 rounded-lg bg-white/90 text-lg text-gray-900 shadow"
          >
            −
          </button>
          <button
              type="button"
              aria-label="처음 크기로"
              onClick={reset}
              className="h-9 w-9 rounded-lg bg-white/90 text-xs font-semibold text-gray-900 shadow"
          >
            전체
          </button>
        </div>
      </div>
  );
}