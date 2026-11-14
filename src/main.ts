import "./style.css";
import type { WeatherController } from "@fluritheme/fluri";
import type { GrinchController } from "@fluritheme/grinch";
import type { TinyBuildersController } from "@fluritheme/tiny-builders";
import type { RainyWindowController } from "@fluritheme/rainy-window";
import type { GhostController } from "@fluritheme/ghost";
import type { CatController } from "@fluritheme/black-cat";
import type { SpiderController } from "@fluritheme/spider";
type Theme = {
  element: HTMLElement;
  type: "winter" | "spider" | "grinch" | "cat" | "ghost" | "rain" | "builders";
  controller?:
    | WeatherController
    | SpiderController
    | GrinchController
    | CatController
    | GhostController
    | RainyWindowController
    | TinyBuildersController;
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
  ["grinch-scene", "grinch"],
  ["cat-scene", "cat"],
  ["ghost-scene", "ghost"],
  ["rain-scene", "rain"],
  ["builders-scene", "builders"],
] as const) {
  const element = document.getElementById(id);
  if (element) themes.push({ element, type, visible: false, loading: false });
}
function reconcile(): void {
  if (destroyed) return;
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
        interactions: {
          snowballs: { enabled: true },
          snowman: { enabled: true },
          yeti: { enabled: true },
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
    } else if (theme.type === "spider") {
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
    } else if (theme.type === "builders") {
      const { createTinyBuilders } = await import("@fluritheme/tiny-builders");
      if (destroyed) return;
      theme.controller = createTinyBuilders({
        root: theme.element,
        surfaces: "[data-build-surface]",
        crew: 5,
        maxSites: 1,
        size: 1.4,
        pace: 1.5,
        seed: 19,
        zIndex: 4,
      });
    } else if (theme.type === "rain") {
      const { createRainyWindow } = await import("@fluritheme/rainy-window");
      if (destroyed) return;
      theme.controller = createRainyWindow({
        root: theme.element,
        preset: "rain",
        maxDrops: 180,
        seed: 27,
        zIndex: 3,
      });
    } else if (theme.type === "ghost") {
      const { createGhost } = await import("@fluritheme/ghost");
      if (destroyed) return;
      theme.controller = createGhost({
        root: theme.element,
        objects: "[data-ghost-object]",
        size: innerWidth < 600 ? 110 : 140,
        shyness: 0.6,
        seed: 17,
        zIndex: 4,
      });
    } else if (theme.type === "cat") {
      const { createCat } = await import("@fluritheme/black-cat");
      if (destroyed) return;
      theme.controller = createCat({
        root: theme.element,
        surfaces: "[data-cat-surface]",
        hidingSpots: "[data-cat-hide]",
        size: innerWidth < 600 ? 105 : 140,
        seed: 19,
        zIndex: 4,
      });
    } else {
      const { createGrinch } = await import("@fluritheme/grinch");
      if (destroyed) return;
      const grinch = createGrinch({
        root: theme.element,
        territory: "root",
        targets: "[data-grinch-gift]",
        objects: "[data-grinch-object]",
        size: 0.85,
        entrance: "rope",
        speed: 2,
        fearRadius: 80,
        cooldown: 10,
        zIndex: 4,
      });
      theme.controller = grinch;
      let landed = false;
      grinch.on("phase", ({ phase }) => {
        if (landed || phase !== "waving") return;
        landed = true;
        grinch.update({ speed: 1.3 });
        grinch.steal();
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
        if (theme.visible && theme.type !== "grinch") void mount(theme);
      }
    }
    reconcile();
  },
  { rootMargin: "80px" },
);
for (const theme of themes) observer.observe(theme.element);
// Wait for the present itself so an early section intersection cannot place him
// at a fallback point far from the gift while it is still below the viewport.
const grinchTheme = themes.find((theme) => theme.type === "grinch");
const present = grinchTheme?.element.querySelector("[data-grinch-gift]");
const presentObserver = new IntersectionObserver((entries) => {
  if (!grinchTheme) return;
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    void mount(grinchTheme);
    presentObserver.unobserve(entry.target);
  }
});
if (present) presentObserver.observe(present);
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
    presentObserver.disconnect();
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
        pointer.style.transform = `translate3d(${pointX - 20}px,${pointY - 4}px,0)`;
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
