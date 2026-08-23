"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  FaCamera,
  FaEllipsis,
  FaGlobe,
  FaImage,
  FaInstagram,
  FaLocationDot,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

export const SOCIAL_PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Website",
] as const;

function platformIcon(platform: string) {
  if (platform === "Instagram") return <FaInstagram />;
  if (platform === "TikTok") return <FaTiktok />;
  if (platform === "YouTube") return <FaYoutube />;
  if (platform === "X") return <FaXTwitter />;
  return <FaGlobe />;
}

function platformTone(platform: string, selected: boolean) {
  if (!selected) return "border-slate-200 bg-white text-slate-600";
  if (platform === "Instagram") return "border-fuchsia-200 bg-gradient-to-br from-amber-50 via-pink-50 to-violet-50 text-fuchsia-700 shadow-[0_8px_22px_rgba(219,39,119,0.12)]";
  if (platform === "TikTok") return "border-slate-900 bg-slate-950 text-white shadow-[0_8px_22px_rgba(15,23,42,0.15)]";
  if (platform === "YouTube") return "border-red-200 bg-red-50 text-red-600 shadow-[0_8px_22px_rgba(220,38,38,0.10)]";
  if (platform === "X") return "border-slate-900 bg-slate-950 text-white";
  return "border-blue-200 bg-blue-50 text-blue-600";
}

export function SocialPlatformPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {SOCIAL_PLATFORM_OPTIONS.map((platform) => {
        const selected = value === platform;
        return (
          <button
            key={platform}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(platform)}
            className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-black transition ${platformTone(platform, selected)}`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/80 text-[17px] text-current shadow-sm ring-1 ring-black/5">
              {platformIcon(platform)}
            </span>
            <span className="truncate">{platform}</span>
          </button>
        );
      })}
    </div>
  );
}

function menuIcon(value: string) {
  if (value.includes("Instagram")) return <FaInstagram />;
  if (value.includes("TikTok")) return <FaTiktok />;
  if (value.includes("YouTube")) return <FaYoutube />;
  if (value.includes("動画素材")) return <FaCamera />;
  if (value.includes("写真素材")) return <FaImage />;
  if (value.includes("イベント")) return <FaLocationDot />;
  return <FaEllipsis />;
}

function menuTone(value: string, selected: boolean) {
  if (!selected) return "border-slate-200 bg-white text-slate-700";
  if (value.includes("Instagram")) return "border-fuchsia-200 bg-gradient-to-br from-amber-50 via-pink-50 to-violet-50 text-fuchsia-800";
  if (value.includes("TikTok")) return "border-slate-900 bg-slate-950 text-white";
  if (value.includes("YouTube")) return "border-red-200 bg-red-50 text-red-700";
  if (value.includes("素材")) return "border-violet-200 bg-violet-50 text-violet-700";
  if (value.includes("イベント")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-300 bg-slate-100 text-slate-800";
}

export function MenuTypePicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-h-[58px] items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition ${menuTone(option.value, selected)}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/85 text-[17px] text-current shadow-sm ring-1 ring-black/5">
              {menuIcon(option.value)}
            </span>
            <span className="whitespace-pre-line text-[11px] font-black leading-4">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const CROP_SIZE = 768;

type CropGeometry = {
  renderedWidth: number;
  renderedHeight: number;
  drawX: number;
  drawY: number;
  maxPanX: number;
  maxPanY: number;
  panX: number;
  panY: number;
};

type CropTransform = {
  zoom: number;
  panX: number;
  panY: number;
};

function getCropGeometry(
  sourceWidth: number,
  sourceHeight: number,
  viewportSize: number,
  zoom: number,
  panX: number,
  panY: number
): CropGeometry {
  const baseScale = Math.max(viewportSize / sourceWidth, viewportSize / sourceHeight);
  const scale = baseScale * zoom;
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const maxPanX = Math.max(0, (renderedWidth - viewportSize) / 2);
  const maxPanY = Math.max(0, (renderedHeight - viewportSize) / 2);
  const clampedPanX = clamp(panX, -maxPanX, maxPanX);
  const clampedPanY = clamp(panY, -maxPanY, maxPanY);

  return {
    renderedWidth,
    renderedHeight,
    drawX: viewportSize / 2 - renderedWidth / 2 + clampedPanX,
    drawY: viewportSize / 2 - renderedHeight / 2 + clampedPanY,
    maxPanX,
    maxPanY,
    panX: clampedPanX,
    panY: clampedPanY,
  };
}

function drawSquareCrop(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
  zoom: number,
  panX: number,
  panY: number
) {
  const geometry = getCropGeometry(
    image.naturalWidth,
    image.naturalHeight,
    CROP_SIZE,
    zoom,
    panX,
    panY
  );

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
  ctx.drawImage(
    image,
    geometry.drawX,
    geometry.drawY,
    geometry.renderedWidth,
    geometry.renderedHeight
  );
}

async function cropSquareImage(
  file: File,
  zoom: number,
  panX: number,
  panY: number
) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image crop");

    drawSquareCrop(ctx, image, zoom, panX, panY);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Could not crop image")),
        "image/jpeg",
        0.92
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, "") || "profile";
    return new File([blob], `${baseName}-profile.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointerDistance(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function pointerMidpoint(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return null;
  return {
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2,
  };
}

export function AvatarCropPicker({
  previewUrl,
  label,
  help,
  chooseLabel,
  locale,
  onConfirm,
}: {
  previewUrl: string | null;
  label: string;
  help: string;
  chooseLabel: string;
  locale: "ja" | "en";
  onConfirm: (file: File, previewUrl: string) => void;
}) {
  const [draft, setDraft] = useState<{ file: File; url: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draftImage, setDraftImage] = useState<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const mountedRef = useRef(true);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartRef = useRef<{
    distance: number;
    zoom: number;
    panX: number;
    panY: number;
    midpointX: number;
    midpointY: number;
  } | null>(null);
  const cropStateRef = useRef({ zoom: MIN_ZOOM, panX: 0, panY: 0, image: null as HTMLImageElement | null });

  useEffect(() => {
    return () => {
      if (draft?.url) URL.revokeObjectURL(draft.url);
    };
  }, [draft]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    cropStateRef.current.image = draftImage;
  }, [draftImage]);

  useEffect(() => {
    setDraftImage(null);
    if (!draft) return;

    let active = true;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (active) setDraftImage(image);
    };
    image.src = draft.url;

    return () => {
      active = false;
    };
  }, [draft]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !draftImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSquareCrop(ctx, draftImage, zoom, panX, panY);
  }, [draftImage, zoom, panX, panY]);

  const closeDraft = () => {
    activePointersRef.current.clear();
    pinchStartRef.current = null;
    setDraft(null);
    cropStateRef.current = { zoom: MIN_ZOOM, panX: 0, panY: 0, image: null };
    setZoom(MIN_ZOOM);
    setPanX(0);
    setPanY(0);
  };

  const selectFile = (files: FileList | null) => {
    const file = Array.from(files ?? []).find((item) => item.type.startsWith("image/"));
    if (!file) return;
    activePointersRef.current.clear();
    pinchStartRef.current = null;
    cropStateRef.current = { zoom: MIN_ZOOM, panX: 0, panY: 0, image: null };
    setZoom(MIN_ZOOM);
    setPanX(0);
    setPanY(0);
    setDraft({ file, url: URL.createObjectURL(file) });
  };

  const setCrop = (nextZoom: number, nextPanX: number, nextPanY: number) => {
    const image = cropStateRef.current.image;
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const geometry = image
      ? getCropGeometry(image.naturalWidth, image.naturalHeight, CROP_SIZE, clampedZoom, nextPanX, nextPanY)
      : null;
    const next = {
      zoom: clampedZoom,
      panX: geometry?.panX ?? 0,
      panY: geometry?.panY ?? 0,
      image,
    };
    cropStateRef.current = next;
    setZoom(next.zoom);
    setPanX(next.panX);
    setPanY(next.panY);
  };

  const panByScreenPixels = (deltaX: number, deltaY: number) => {
    const canvas = previewCanvasRef.current;
    const { image, zoom: currentZoom, panX: currentPanX, panY: currentPanY } = cropStateRef.current;
    if (!canvas || !image) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const cropDeltaX = deltaX * (CROP_SIZE / bounds.width);
    const cropDeltaY = deltaY * (CROP_SIZE / bounds.height);
    setCrop(currentZoom, currentPanX + cropDeltaX, currentPanY + cropDeltaY);
  };

  const cropPointFromClient = (clientX: number, clientY: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: (clientX - bounds.left) * (CROP_SIZE / bounds.width),
      y: (clientY - bounds.top) * (CROP_SIZE / bounds.height),
    };
  };

  const zoomAroundCropPoint = (
    nextZoom: number,
    anchorX: number,
    anchorY: number,
    transform: CropTransform = cropStateRef.current,
    sourceX = anchorX,
    sourceY = anchorY
  ) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const zoomRatio = clampedZoom / transform.zoom;
    const center = CROP_SIZE / 2;
    setCrop(
      clampedZoom,
      anchorX - center - (sourceX - center - transform.panX) * zoomRatio,
      anchorY - center - (sourceY - center - transform.panY) * zoomRatio
    );
  };

  const resetPinch = () => {
    const points = Array.from(activePointersRef.current.values()).slice(0, 2);
    const midpoint = pointerMidpoint(points);
    const cropPoint = midpoint ? cropPointFromClient(midpoint.x, midpoint.y) : null;
    pinchStartRef.current = cropPoint && points.length >= 2
      ? {
          distance: pointerDistance(points),
          zoom: cropStateRef.current.zoom,
          panX: cropStateRef.current.panX,
          panY: cropStateRef.current.panY,
          midpointX: cropPoint.x,
          midpointY: cropPoint.y,
        }
      : null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    resetPinch();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const previous = activePointersRef.current.get(event.pointerId);
    if (!previous) return;
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(activePointersRef.current.values()).slice(0, 2);

    if (points.length === 1) {
      panByScreenPixels(event.clientX - previous.x, event.clientY - previous.y);
      return;
    }

    const start = pinchStartRef.current;
    const distance = pointerDistance(points);
    const midpoint = pointerMidpoint(points);
    const cropPoint = midpoint ? cropPointFromClient(midpoint.x, midpoint.y) : null;
    if (start && cropPoint && start.distance > 0 && distance > 0) {
      zoomAroundCropPoint(
        start.zoom * (distance / start.distance),
        cropPoint.x,
        cropPoint.y,
        start,
        start.midpointX,
        start.midpointY
      );
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetPinch();
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const cropPoint = cropPointFromClient(event.clientX, event.clientY);
    if (!cropPoint) return;
    zoomAroundCropPoint(
      cropStateRef.current.zoom * Math.exp(-event.deltaY * 0.0015),
      cropPoint.x,
      cropPoint.y
    );
  };

  const confirmCrop = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const { zoom: currentZoom, panX: currentPanX, panY: currentPanY } = cropStateRef.current;
      const cropped = await cropSquareImage(draft.file, currentZoom, currentPanX, currentPanY);
      const nextPreview = URL.createObjectURL(cropped);
      onConfirm(cropped, nextPreview);
      closeDraft();
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-white outline outline-1 outline-slate-200">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-slate-300">Icon</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">{help}</p>
          <label className="mt-2 inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-[#ff3860] px-4 text-xs font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.20)] transition hover:bg-[#ff4f58]">
            {previewUrl
              ? locale === "ja" ? "写真を調整・変更" : "Adjust or change"
              : chooseLabel}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                selectFile(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {draft ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/65 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="flex h-[100dvh] w-full max-w-none flex-col bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl sm:h-auto sm:max-w-[420px] sm:rounded-[28px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black tracking-[-0.04em] text-slate-950">
                  {locale === "ja" ? "プロフィール写真を調整" : "Adjust profile photo"}
                </p>
                <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                  {locale === "ja"
                    ? "丸いアイコンに入る位置を確認してから確定してください。"
                    : "Position the photo inside the round profile icon, then confirm."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDraft}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-500"
                aria-label={locale === "ja" ? "閉じる" : "Close"}
              >
                ×
              </button>
            </div>

            <div className="mx-auto mt-6 w-full max-w-[420px] sm:mt-4">
              <div className="relative aspect-square overflow-hidden bg-slate-900">
                <canvas
                  ref={previewCanvasRef}
                  aria-label={locale === "ja" ? "プロフィール写真の切り抜きプレビュー" : "Profile photo crop preview"}
                  width={CROP_SIZE}
                  height={CROP_SIZE}
                  className="block h-full w-full touch-none select-none cursor-grab active:cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onWheel={handleWheel}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full border border-white/80"
                  style={{ boxShadow: "0 0 0 999px rgba(15, 23, 42, 0.48)" }}
                />
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] font-bold text-slate-500">
              {locale === "ja" ? "ドラッグで位置調整・ピンチで拡大／縮小" : "Drag to move. Pinch or scroll to zoom."}
            </p>

            <div className="mt-auto grid grid-cols-[96px_1fr] gap-2 pt-4 sm:mt-4 sm:pt-0">
              <button type="button" onClick={closeDraft} className="h-11 rounded-full bg-white text-xs font-black text-slate-600 ring-1 ring-slate-200">
                {locale === "ja" ? "戻る" : "Back"}
              </button>
              <button
                type="button"
                onClick={() => void confirmCrop()}
                disabled={saving}
                className="h-11 rounded-full bg-[#ff3860] text-sm font-black text-white shadow-[0_10px_24px_rgba(255,56,96,0.22)] disabled:opacity-60"
              >
                {saving
                  ? locale === "ja" ? "調整中..." : "Cropping..."
                  : locale === "ja" ? "この位置で確定" : "Use this crop"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
