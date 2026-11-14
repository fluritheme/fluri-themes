import { resolveOptions, selector, validateTuning } from './options.js';
import { Mischief, distance, type Gift } from './model.js';
import { giftColor, paintGrinch, paintPresents } from './paint.js';
import { pageObjects, outsideObjects, type PageObject } from './layers.js';
import type {
  Box,
  GrinchController,
  GrinchEvent,
  GrinchEventData,
  GrinchOptions,
  GrinchSnapshot,
  GrinchTuning,
  Point,
} from './types.js';
export type {
  Box,
  GiftState,
  GrinchController,
  GrinchEvent,
  GrinchEventData,
  GrinchMood,
  GrinchOptions,
  GrinchPhase,
  GrinchSnapshot,
  GrinchTuning,
  Point,
} from './types.js';
export { defaults } from './options.js';
const events = new Set<GrinchEvent>([
  'ready',
  'phase',
  'theft:start',
  'gift:stolen',
  'gift:returned',
  'caught',
  'redeemed',
  'error',
]);
/** A decorative, page-aware visitor. The runtime performs no network requests and never moves host content. */
export function createGrinch(input: GrinchOptions = {}): GrinchController {
  const options = resolveOptions(input);
  let configuredSize = options.size;
  let state: GrinchSnapshot['state'] = 'idle',
    reduced = options.motion === 'none';
  const listeners = new Map<GrinchEvent, Set<(data: GrinchEventData) => void>>();
  const emit = (event: GrinchEvent, data: GrinchEventData): void => {
    for (const fn of [...(listeners.get(event) ?? [])])
      try {
        fn({ ...data });
      } catch {
        if (event !== 'error')
          for (const report of [...(listeners.get('error') ?? [])])
            try {
              report({ source: 'listener' });
            } catch {
              /* User callback errors cannot break the effect. */
            }
      }
  };
  const model = new Mischief(options, emit);
  const snapshot = (): GrinchSnapshot => ({
    state:
      state === 'running' && (reduced || (typeof document !== 'undefined' && document.hidden))
        ? 'paused'
        : state,
    reducedMotion: reduced,
    mood: options.mood,
    phase: model.actor.phase,
    character:
      state === 'idle' || state === 'destroyed'
        ? null
        : {
            x: model.actor.x,
            y: model.actor.y,
            visible: model.actor.visible,
            behind: model.actor.behind,
            facing: model.actor.facing,
          },
    gifts: model.gifts.map((g) => ({
      ...model.giftPoint(g),
      id: g.id,
      state: g.state,
      visible: g.visible,
    })),
    stolen: model.stolen,
    totalStolen: model.totalStolen,
    caught: model.caught,
  });
  const on = (event: GrinchEvent, fn: (data: GrinchEventData) => void): (() => void) => {
    if (!events.has(event) || typeof fn !== 'function')
      throw new TypeError('Grinch: invalid event or listener.');
    if (state === 'destroyed') return () => {};
    const set = listeners.get(event) ?? new Set();
    set.add(fn);
    listeners.set(event, set);
    return () => {
      set.delete(fn);
    };
  };
  const noop: GrinchController = {
    steal(value) {
      if (value !== undefined) selector(value);
      return false;
    },
    shoo() {},
    returnGifts() {},
    redeem() {
      options.mood = 'friendly';
    },
    wave() {},
    update(patch) {
      validateTuning(patch);
      Object.assign(options, resolveOptions({ ...options, ...patch }));
    },
    refresh() {},
    pause() {},
    resume() {},
    destroy() {
      state = 'destroyed';
      model.dispose();
      listeners.clear();
    },
    getState: snapshot,
    on,
  };
  if (typeof document === 'undefined' || typeof window === 'undefined') return noop;
  const doc = document,
    win = window,
    root = input.root ?? doc;
  if (root !== doc && (!(root instanceof win.HTMLElement) || root.ownerDocument !== doc))
    throw new TypeError('Grinch: root must be an element in the current document.');
  if (typeof input.targets === 'string') root.querySelector(input.targets);
  else if (
    input.targets &&
    input.targets.some((el) => !(el instanceof win.HTMLElement) || el.ownerDocument !== doc)
  )
    throw new TypeError('Grinch: targets must belong to this document.');
  root.querySelector(options.objects);
  const canvas = doc.createElement('canvas'),
    ctx = canvas.getContext('2d');
  if (!ctx) return noop;
  canvas.dataset.fluriGrinch = '';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none!important;z-index:${options.zIndex};contain:strict;display:block;`;
  (doc.body ?? doc.documentElement).append(canvas);
  const media = win.matchMedia('(prefers-reduced-motion: reduce)');
  reduced = options.motion === 'none' || (options.motion === 'system' && media.matches);
  let raf: number | null = null,
    lastTime = 0,
    dirty = true,
    lastMeasure = -Infinity,
    width = 0,
    height = 0,
    dpr = 1,
    nextId = 1;
  let pointer: Point | null = null,
    pointerUntil = 0;
  let objects: PageObject[] = [],
    territory: Box = { x: 0, y: 0, width: 0, height: 0 },
    view: Box = { ...territory };
  let tracked = new Map<HTMLElement, Gift>(),
    observed: HTMLElement[] = [];
  const ids = new WeakMap<HTMLElement, string>(),
    objectIds = new WeakMap<HTMLElement, string>(),
    cleanup: (() => void)[] = [];
  let resize: ResizeObserver | undefined, button: HTMLButtonElement | undefined;
  const select = (): HTMLElement[] => {
    let list: Element[];
    if (typeof input.targets === 'string') list = [...root.querySelectorAll(input.targets)];
    else if (input.targets) list = [...input.targets];
    else {
      list = [...root.querySelectorAll('[data-grinch-gift]')];
      if (!list.length)
        list = [
          ...root.querySelectorAll(
            '[data-grinch-surface], [data-weather-surface], article, .card, button',
          ),
        ];
    }
    return list
      .filter(
        (el): el is HTMLElement =>
          el instanceof win.HTMLElement &&
          root.contains(el) &&
          !el.closest('[data-grinch-ignore], [data-grinch-ui]'),
      )
      .slice(0, options.maxGifts);
  };
  function measure(): void {
    dirty = false;
    width = win.innerWidth;
    height = win.innerHeight;
    options.size = configuredSize * (width < 600 ? options.mobileScale : 1);
    dpr = Math.min(
      win.devicePixelRatio || 1,
      2,
      Math.sqrt(4_000_000 / Math.max(1, width * height)),
    );
    const pw = Math.max(1, Math.round(width * dpr)),
      ph = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    const scroll = { x: win.scrollX, y: win.scrollY };
    const r = root instanceof win.HTMLElement ? root.getBoundingClientRect() : null;
    territory =
      options.territory === 'root' && r
        ? { x: r.left + scroll.x, y: r.top + scroll.y, width: r.width, height: r.height }
        : {
            x: 0,
            y: 0,
            width: Math.max(width, doc.documentElement.scrollWidth),
            height: Math.max(height, doc.documentElement.scrollHeight),
          };
    const x = Math.max(territory.x, scroll.x),
      y = Math.max(territory.y, scroll.y);
    view = {
      x,
      y,
      width: Math.max(0, Math.min(territory.x + territory.width, scroll.x + width) - x),
      height: Math.max(0, Math.min(territory.y + territory.height, scroll.y + height) - y),
    };
    const targets = select(),
      next = new Map<HTMLElement, Gift>();
    targets.forEach((el, index) => {
      const rect = el.getBoundingClientRect(),
        style = win.getComputedStyle(el);
      if (!el.isConnected || rect.width < 48 || rect.height < 12) return;
      let id = ids.get(el);
      if (!id) {
        id = `gift-${nextId++}`;
        ids.set(el, id);
      }
      const point = {
        x: rect.left + rect.width * (0.55 + (index % 3) * 0.09) + scroll.x,
        y: rect.top + scroll.y,
      };
      const visible =
        style.display !== 'none' &&
        style.visibility === 'visible' &&
        Number(style.opacity) > 0 &&
        rect.bottom > 0 &&
        rect.top < height &&
        rect.right > 0 &&
        rect.left < width;
      const gift = tracked.get(el) ?? {
        id,
        position: point,
        state: 'available',
        visible,
        color: giftColor(index),
        returning: null,
        element: el,
      };
      gift.position = point;
      gift.visible = visible;
      next.set(el, gift);
    });
    for (const [el, gift] of tracked) if (!next.has(el)) gift.visible = false;
    tracked = next;
    model.gifts = [...next.values()];
    objects = pageObjects(doc, win, options.objects);
    objects.forEach((o) => {
      if (!objectIds.has(o.element)) objectIds.set(o.element, `shelter-${nextId++}`);
    });
    if (
      resize &&
      (targets.length !== observed.length || targets.some((el, i) => el !== observed[i]))
    ) {
      resize.disconnect();
      resize.observe(root instanceof win.HTMLElement ? root : doc.documentElement);
      targets.forEach((el) => resize?.observe(el));
      observed = targets;
    }
    model.spawn(view, reduced);
    lastMeasure = win.performance.now();
  }
  const shelters = () =>
    objects.map((o) => ({
      id: objectIds.get(o.element)!,
      box: { ...o.box, x: o.box.x + win.scrollX, y: o.box.y + win.scrollY },
    }));
  function draw(dt: number): void {
    if (!ctx) return;
    model.step(dt, view, shelters(), pointer, reduced);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (options.territory === 'root') {
      ctx.beginPath();
      ctx.rect(
        territory.x - win.scrollX,
        territory.y - win.scrollY,
        territory.width,
        territory.height,
      );
      ctx.clip();
    }
    ctx.save();
    ctx.translate(-win.scrollX, -win.scrollY);
    paintPresents(ctx, model, options.size, false);
    ctx.restore();
    ctx.save();
    if (model.actor.behind) outsideObjects(ctx, objects, width, height);
    ctx.translate(-win.scrollX, -win.scrollY);
    paintGrinch(ctx, model, options, reduced);
    paintPresents(ctx, model, options.size, true);
    ctx.restore();
    ctx.restore();
    if (model.actor.behind)
      model.actor.visible =
        model.actor.visible &&
        !objects.some((o) =>
          ctx.isPointInPath(
            o.path,
            (model.actor.x - win.scrollX) * dpr,
            (model.actor.y - 70 * options.size - win.scrollY) * dpr,
          ),
        );
    if (button) {
      const label = reduced
        ? 'Motion reduced'
        : state === 'paused'
          ? 'Resume Grinch'
          : 'Pause Grinch';
      if (button.textContent !== label) button.textContent = label;
      if (button.disabled !== reduced) button.disabled = reduced;
      const pressed = String(state === 'paused' || reduced);
      if (button.getAttribute('aria-pressed') !== pressed)
        button.setAttribute('aria-pressed', pressed);
    }
  }
  function schedule(): void {
    if (raf === null && state !== 'destroyed' && !doc.hidden) raf = win.requestAnimationFrame(tick);
  }
  function invalidate(): void {
    if (state === 'destroyed') return;
    dirty = true;
    schedule();
  }
  function tick(now: number): void {
    raf = null;
    if (state === 'destroyed' || doc.hidden) return;
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
    lastTime = now;
    if (dirty || (options.observe && now - lastMeasure > 650)) measure();
    if (now > pointerUntil) pointer = null;
    draw(state === 'running' && !reduced ? dt : 0);
    if (state === 'running' && !reduced) schedule();
  }
  function listen(target: EventTarget, name: string, fn: EventListener, capture = false): void {
    target.addEventListener(name, fn, { passive: true, capture });
    cleanup.push(() => target.removeEventListener(name, fn, capture));
  }
  listen(win, 'resize', invalidate);
  listen(
    doc,
    'scroll',
    () => {
      pointer = null;
      invalidate();
    },
    true,
  );
  listen(doc, 'pointermove', (event) => {
    if (state !== 'running' || reduced) return;
    const e = event as PointerEvent;
    if (e.pointerType === 'touch') return;
    pointer = { x: e.clientX + win.scrollX, y: e.clientY + win.scrollY };
    pointerUntil = win.performance.now() + 700;
  });
  listen(doc, 'pointerdown', (event) => {
    if (state !== 'running' || reduced || model.actor.behind) return;
    const e = event as PointerEvent,
      p = { x: e.clientX + win.scrollX, y: e.clientY + win.scrollY };
    if (distance(p, { x: model.actor.x, y: model.actor.y - 65 * options.size }) < 50 * options.size)
      model.shoo();
  });
  listen(doc, 'pointerleave', () => {
    pointer = null;
  });
  listen(win, 'blur', () => {
    pointer = null;
  });
  listen(doc, 'visibilitychange', () => {
    lastTime = 0;
    if (doc.hidden && raf !== null) {
      win.cancelAnimationFrame(raf);
      raf = null;
    } else invalidate();
  });
  listen(media, 'change', () => {
    reduced = options.motion === 'none' || (options.motion === 'system' && media.matches);
    pointer = null;
    model.settleEntrance();
    if (reduced) model.returnGifts(true);
    lastTime = 0;
    invalidate();
  });
  if (options.observe) {
    const mutation = new MutationObserver((records) => {
      if (
        records.some((record) => {
          const el =
            record.target.nodeType === 1 ? (record.target as Element) : record.target.parentElement;
          return (
            record.target !== canvas &&
            !canvas.contains(record.target) &&
            !el?.closest('[data-grinch-ui]')
          );
        })
      )
        invalidate();
    });
    mutation.observe(root === doc ? doc.documentElement : root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'style',
        'class',
        'hidden',
        'open',
        'data-grinch-gift',
        'data-grinch-ignore',
      ],
    });
    cleanup.push(() => mutation.disconnect());
    resize = new ResizeObserver(invalidate);
    cleanup.push(() => resize?.disconnect());
  }
  if (options.controls) {
    button = doc.createElement('button');
    button.type = 'button';
    button.dataset.grinchUi = '';
    button.style.cssText = `position:fixed;right:16px;bottom:16px;border:1px solid #dce4c9;border-radius:100px;background:#15291f;color:#fff5df;padding:12px 18px;font:600 13px system-ui;z-index:${Math.min(2147483647, options.zIndex + 1)};min-height:44px;`;
    button.addEventListener('click', () => {
      if (state === 'running') {
        state = 'paused';
        pointer = null;
        if (raf !== null) win.cancelAnimationFrame(raf);
        raf = null;
        draw(0);
      } else if (state === 'paused') {
        state = 'running';
        lastTime = 0;
        invalidate();
      }
    });
    doc.body.append(button);
  }
  void doc.fonts.ready.then(() => {
    if (state !== 'destroyed') invalidate();
  });
  state = 'running';
  measure();
  draw(0);
  if (!reduced) schedule();
  queueMicrotask(() => {
    if (state !== 'destroyed') emit('ready', {});
  });
  return {
    steal(value) {
      if (value !== undefined) {
        selector(value);
        root.querySelector(value);
      }
      if (state === 'destroyed' || state === 'paused' || reduced) return false;
      const gift = value ? model.gifts.find((g) => g.element?.matches(value)) : undefined;
      if (value && !gift) return false;
      const accepted = model.steal(gift);
      if (accepted) schedule();
      return accepted;
    },
    shoo() {
      if (state === 'destroyed') return;
      model.shoo(reduced);
      invalidate();
    },
    returnGifts() {
      if (state === 'destroyed') return;
      model.returnGifts(reduced);
      invalidate();
    },
    redeem() {
      if (state === 'destroyed') return;
      model.redeem(reduced);
      invalidate();
    },
    wave() {
      if (state === 'destroyed') return;
      model.wave();
      invalidate();
    },
    update(patch: GrinchTuning) {
      if (state === 'destroyed') return;
      validateTuning(patch);
      const next = resolveOptions({ ...options, size: configuredSize, ...patch }),
        changed = next.mood !== options.mood;
      configuredSize = next.size;
      Object.assign(options, next);
      options.size = configuredSize * (width < 600 ? options.mobileScale : 1);
      if (changed && options.mood === 'friendly') model.redeem(reduced);
      else if (changed) model.wave();
      invalidate();
    },
    refresh: invalidate,
    pause() {
      if (state !== 'running') return;
      state = 'paused';
      pointer = null;
      if (raf !== null) win.cancelAnimationFrame(raf);
      raf = null;
      draw(0);
    },
    resume() {
      if (state !== 'paused') return;
      state = 'running';
      lastTime = 0;
      invalidate();
    },
    destroy() {
      if (state === 'destroyed') return;
      state = 'destroyed';
      if (raf !== null) win.cancelAnimationFrame(raf);
      raf = null;
      cleanup.forEach((fn) => fn());
      canvas.remove();
      button?.remove();
      button = undefined;
      model.dispose();
      objects = [];
      tracked.clear();
      observed = [];
      listeners.clear();
      pointer = null;
    },
    getState: snapshot,
    on,
  };
}
