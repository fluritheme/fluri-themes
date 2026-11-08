import "./style.css";
import type { WeatherController } from "@fluritheme/fluri";
import type { SpiderController } from "@fluritheme/spider";
type Theme = {
  element: HTMLElement;
  type: "winter" | "spider";
  controller?: WeatherController | SpiderController;
  visible: boolean;
  loading: boolean;
};
const media = matchMedia("(prefers-reduced-motion: reduce)");
const button = document.querySelector<HTMLButtonElement>("#motion-toggle");
let stopped = false,
  destroyed = false;
const themes: Theme[] = [];
for (const [id, type] of [
  ["winter-scene", "winter"],
  ["spider-scene", "spider"],
] as const) {
  const element = document.getElementById(id);
  if (element) themes.push({ element, type, visible: false, loading: false });
}
function reconcile(): void {
  const paused = stopped || media.matches || document.hidden;
  for (const theme of themes) {
    if (paused || !theme.visible) theme.controller?.pause();
    else theme.controller?.resume();
  }
  if (button) {
    button.disabled = media.matches;
    button.textContent = media.matches
      ? "REDUCED MOTION"
      : stopped
        ? "▷ RESUME MOTION"
        : "Ⅱ PAUSE MOTION";
    button.setAttribute("aria-pressed", String(paused));
    button.setAttribute(
      "aria-label",
      media.matches
        ? "Motion paused for reduced motion"
        : stopped
          ? "Resume motion"
          : "Pause motion",
    );
  }
}
async function mount(theme: Theme): Promise<void> {
  if (theme.controller || theme.loading || destroyed) return;
  theme.loading = true;
  try {
    if (theme.type === "winter") {
      const { createWeather } = await import("@fluritheme/fluri");
      if (destroyed) return;
      const weather = createWeather({
        container: theme.element,
        preset: "gentle-snow",
        seed: 42,
        dom: { detection: "explicit" },
        snow: {
          particleCount: 140,
          accumulation: { maxDepth: 14, growthRate: 0.6 },
        },
        performance: { maxDPR: 1.5, maxFPS: 45 },
        accessibility: { reducedMotion: "respect" },
      });
      weather.registerSurface(
        theme.element.querySelector("[data-weather-surface]")!,
        { material: "sticky", maxSnowDepth: 14 },
      );
      weather.start();
      weather.addSnow(2);
      theme.controller = weather;
    } else {
      const { createSpider } = await import("@fluritheme/spider");
      if (destroyed) return;
      theme.controller = createSpider({
        root: theme.element,
        territory: "root",
        targets: "[data-spider-web]",
        objects: "[data-spider-web]",
        spiders: 1,
        maxWebs: 1,
        size: 1.6,
        webSize: 145,
        webDensity: 0.75,
        webOpacity: 0.8,
        fearRadius: 100,
        speed: 1.3,
        zIndex: 4,
      });
    }
    reconcile();
  } catch {
    /* Product links work independently if a browser cannot render the decorative effect. */
  } finally {
    theme.loading = false;
  }
}
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const theme = themes.find((item) => item.element === entry.target);
      if (theme) {
        theme.visible = entry.isIntersecting;
        if (theme.visible) void mount(theme);
      }
    }
    reconcile();
  },
  { rootMargin: "80px" },
);
for (const theme of themes) observer.observe(theme.element);
button?.addEventListener("click", () => {
  stopped = !stopped;
  reconcile();
});
media.addEventListener("change", reconcile);
document.addEventListener("visibilitychange", reconcile);
reconcile();
window.addEventListener(
  "pagehide",
  () => {
    destroyed = true;
    for (const theme of themes) theme.controller?.destroy();
    observer.disconnect();
  },
  { once: true },
);
let toastTimer: ReturnType<typeof setTimeout>;
for (const copy of document.querySelectorAll<HTMLButtonElement>("[data-copy]"))
  copy.addEventListener("click", async () => {
    const command = copy.dataset.copy!;
    const toast = document.querySelector<HTMLElement>("#toast")!;
    try {
      await navigator.clipboard.writeText(command);
      toast.textContent = "COPIED. GIVE YOUR SITE SOME LIFE.";
    } catch {
      toast.textContent = command;
    }
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 4000);
  });

// A precise desktop cursor, with native input and touch behavior kept available.
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const pointer = document.createElement("div");
pointer.className = "custom-pointer";
pointer.setAttribute("aria-hidden", "true");
pointer.hidden = true;
const pointerArrow = document.createElement("span");
pointerArrow.textContent = "↗";
pointer.append(pointerArrow);
document.body.append(pointer);
let pointerFrame: number | undefined,
  pointX = 0,
  pointY = 0;
function hidePointer(): void {
  pointer.hidden = true;
  document.documentElement.classList.remove("custom-cursor");
  if (pointerFrame !== undefined) {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = undefined;
  }
}
document.addEventListener(
  "pointermove",
  (event) => {
    if (!finePointer.matches || event.pointerType === "touch") {
      hidePointer();
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input,textarea,select,[contenteditable=true]")) {
      hidePointer();
      return;
    }
    pointX = event.clientX;
    pointY = event.clientY;
    pointer.dataset.interactive = String(
      !!target?.closest("a,button:not(:disabled),[role=button]"),
    );
    pointer.hidden = false;
    document.documentElement.classList.add("custom-cursor");
    if (pointerFrame === undefined)
      pointerFrame = requestAnimationFrame(() => {
        pointer.style.transform = `translate3d(${pointX - 21}px,${pointY - 21}px,0)`;
        pointerFrame = undefined;
      });
  },
  { passive: true },
);
document.addEventListener("pointerleave", hidePointer);
window.addEventListener("blur", hidePointer);
finePointer.addEventListener("change", hidePointer);
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab") hidePointer();
});
