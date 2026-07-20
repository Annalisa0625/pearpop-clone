"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Point = { x: number; y: number };

type Gesture =
  | { kind: "drag"; pointerId: number; start: Point; origin: Point }
  | {
      kind: "pinch";
      distance: number;
      zoom: number;
      center: Point;
      origin: Point;
    };

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceBetween(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function centerBetween(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export default function ProfileImageCropModal({
  file,
  locale,
  onCancel,
  onConfirm,
}: {
  file: File;
  locale: "ja" | "en";
  onCancel: () => void;
  onConfirm: (file: File) => Promise<boolean>;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const zoomRef = useRef(MIN_ZOOM);
  const workingRef = useRef(false);
  const cancelRef = useRef(onCancel);
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [viewport, setViewport] = useState(300);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [imageReady, setImageReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  cancelRef.current = onCancel;
  workingRef.current = working;
  zoomRef.current = zoom;

  useEffect(() => {
    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    setImageReady(false);
    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [file]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !workingRef.current) cancelRef.current();
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () => setViewport(node.clientWidth || 300);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const baseScale = Math.max(viewport / natural.width, viewport / natural.height);

  const boundsForZoom = (nextZoom: number) => ({
    x: Math.max(0, (natural.width * baseScale * nextZoom - viewport) / 2),
    y: Math.max(0, (natural.height * baseScale * nextZoom - viewport) / 2),
  });

  const boundOffset = (next: Point, nextZoom: number) => {
    const bounds = boundsForZoom(nextZoom);
    return {
      x: clamp(next.x, -bounds.x, bounds.x),
      y: clamp(next.y, -bounds.y, bounds.y),
    };
  };

  const commitOffset = (next: Point, nextZoom = zoomRef.current) => {
    const bounded = boundOffset(next, nextZoom);
    offsetRef.current = bounded;
    setOffset(bounded);
  };

  const startGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!imageReady || working) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length >= 2) {
      gestureRef.current = {
        kind: "pinch",
        distance: Math.max(1, distanceBetween(points[0], points[1])),
        zoom: zoomRef.current,
        center: centerBetween(points[0], points[1]),
        origin: offsetRef.current,
      };
    } else {
      gestureRef.current = {
        kind: "drag",
        pointerId: event.pointerId,
        start: points[0],
        origin: offsetRef.current,
      };
    }
  };

  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    const points = [...pointersRef.current.values()];
    if (!gesture) return;

    if (gesture.kind === "pinch" && points.length >= 2) {
      const nextZoom = clamp(
        gesture.zoom * (distanceBetween(points[0], points[1]) / gesture.distance),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const center = centerBetween(points[0], points[1]);
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      commitOffset(
        {
          x: gesture.origin.x + center.x - gesture.center.x,
          y: gesture.origin.y + center.y - gesture.center.y,
        },
        nextZoom,
      );
      return;
    }

    if (gesture.kind === "drag" && gesture.pointerId === event.pointerId) {
      commitOffset({
        x: gesture.origin.x + event.clientX - gesture.start.x,
        y: gesture.origin.y + event.clientY - gesture.start.y,
      });
    }
  };

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.entries()];
    if (remaining.length === 1) {
      gestureRef.current = {
        kind: "drag",
        pointerId: remaining[0][0],
        start: remaining[0][1],
        origin: offsetRef.current,
      };
    } else if (remaining.length === 0) {
      gestureRef.current = null;
    }
  };

  const changeZoom = (nextZoom: number) => {
    const boundedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    zoomRef.current = boundedZoom;
    setZoom(boundedZoom);
    commitOffset(offsetRef.current, boundedZoom);
  };

  const confirm = async () => {
    const image = imageRef.current;
    if (!image || !imageReady || working) return;
    setWorking(true);
    setError(null);
    try {
      const displayScale = baseScale * zoom;
      const sourceSize = viewport / displayScale;
      const centerX = natural.width / 2 - offsetRef.current.x / displayScale;
      const centerY = natural.height / 2 - offsetRef.current.y / displayScale;
      const sourceX = clamp(centerX - sourceSize / 2, 0, natural.width - sourceSize);
      const sourceY = clamp(centerY - sourceSize / 2, 0, natural.height - sourceSize);
      const outputSize = Math.max(1, Math.min(1024, Math.round(sourceSize)));
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas_unavailable");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        outputSize,
        outputSize,
      );

      let blob = await canvasToBlob(canvas, "image/webp", 0.85);
      let extension = "webp";
      let mimeType = "image/webp";
      if (!blob || blob.type !== "image/webp") {
        blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
        extension = "jpg";
        mimeType = "image/jpeg";
      }
      if (!blob) throw new Error("crop_failed");

      const uploaded = await onConfirm(
        new File([blob], `avatar-cropped.${extension}`, { type: mimeType }),
      );
      if (!uploaded) setWorking(false);
    } catch {
      setError(
        locale === "ja"
          ? "写真を保存できませんでした"
          : "The photo could not be saved",
      );
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex justify-center bg-[#1f1e21] md:items-center md:bg-black/75 md:p-6 md:backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={locale === "ja" ? "プロフィール写真" : "Profile photo"}
        className="flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-[#232225] text-white md:h-auto md:max-h-[90dvh] md:rounded-3xl"
      >
        <div className="shrink-0 pt-[env(safe-area-inset-top)]">
          <header className="grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 px-3">
            <button
              type="button"
              disabled={working}
              onClick={onCancel}
              className="min-h-11 justify-self-start px-2 text-sm text-white/75 disabled:opacity-50"
            >
              {locale === "ja" ? "キャンセル" : "Cancel"}
            </button>
            <h2 className="text-[16px] font-semibold">
              {locale === "ja" ? "プロフィール写真" : "Profile photo"}
            </h2>
            <button
              type="button"
              disabled={!imageReady || working}
              onClick={() => void confirm()}
              className="flex min-h-11 min-w-11 items-center justify-end gap-1.5 justify-self-end px-2 text-[15px] font-semibold text-rose-400 disabled:opacity-45"
            >
              {working ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300/35 border-t-rose-300" />
              ) : null}
              {working
                ? locale === "ja"
                  ? "保存中…"
                  : "Saving…"
                : locale === "ja"
                  ? "完了"
                  : "Done"}
            </button>
          </header>
        </div>

        <main className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-4">
          <p className="mb-4 text-center text-sm text-white/65">
            {locale === "ja" ? "位置と大きさを調整" : "Adjust position and size"}
          </p>
          <div
            ref={viewportRef}
            onPointerDown={startGesture}
            onPointerMove={moveGesture}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            onContextMenu={(event) => event.preventDefault()}
            className="relative mx-auto aspect-square w-full max-w-[420px] touch-none select-none overflow-hidden bg-black [webkit-touch-callout:none]"
          >
            <img
              ref={imageRef}
              src={objectUrl ?? undefined}
              alt=""
              draggable={false}
              onLoad={(event) => {
                setNatural({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
                setImageReady(true);
              }}
              onError={() =>
                setError(
                  locale === "ja"
                    ? "写真を読み込めませんでした"
                    : "The photo could not be loaded",
                )
              }
              style={{
                width: natural.width * baseScale,
                height: natural.height * baseScale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none origin-center object-contain"
            />
            {!imageReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-sm text-white/70">
                {locale === "ja" ? "読み込み中…" : "Loading…"}
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-[999px] ring-black/60" />
            <div className="pointer-events-none absolute inset-0 rounded-full border border-white/75" />
          </div>

          {error ? (
            <p role="alert" className="mx-auto mt-3 w-full max-w-[420px] text-sm text-rose-300">
              {error}
            </p>
          ) : null}
        </main>

        <div className="shrink-0 border-t border-white/10 bg-[#232225]/96 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <label className="mx-auto block max-w-[420px] text-sm text-white/70">
            <span className="sr-only">{locale === "ja" ? "ズーム" : "Zoom"}</span>
            <input
              aria-label={locale === "ja" ? "ズーム" : "Zoom"}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step="0.01"
              value={zoom}
              disabled={!imageReady || working}
              onChange={(event) => changeZoom(Number(event.target.value))}
              className="h-11 w-full accent-rose-400 disabled:opacity-50"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
