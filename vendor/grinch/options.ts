import type { GrinchOptions, GrinchTuning } from './types.js';
export const defaults = {
  territory: 'page',
  objects:
    '[data-grinch-object], [data-grinch-gift], [data-weather-surface], article, .card, button, img, pre',
  maxGifts: 5,
  size: 1,
  mobileScale: 0.85,
  speed: 1,
  cooldown: 10,
  fearRadius: 90,
  mood: 'mischievous',
  autoSteal: true,
  entrance: 'sneak',
  motion: 'system',
  observe: true,
  zIndex: 140,
  furColor: '#79ad30',
  coatColor: '#c92c42',
  controls: false,
} as const;
export type Options = Omit<Required<GrinchOptions>, 'root' | 'targets'>;
const keys = new Set([...Object.keys(defaults), 'root', 'targets']);
export const tuningKeys = new Set([
  'size',
  'mobileScale',
  'speed',
  'cooldown',
  'fearRadius',
  'mood',
  'autoSteal',
  'furColor',
  'coatColor',
]);
export function selector(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 512)
    throw new TypeError('Grinch: selectors must contain 1–512 characters.');
}
export function resolveOptions(input: GrinchOptions = {}): Options {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('Grinch: options must be an object.');
  if (Object.keys(input).some((k) => !keys.has(k))) throw new TypeError('Grinch: unknown option.');
  const result = { ...defaults, ...input };
  const bounds = {
    maxGifts: [1, 12],
    size: [0.6, 1.8],
    mobileScale: [0.6, 1],
    speed: [0.25, 2],
    cooldown: [3, 120],
    fearRadius: [0, 240],
    zIndex: [-2147483648, 2147483647],
  } as const;
  for (const key of Object.keys(bounds) as (keyof typeof bounds)[]) {
    const value = result[key],
      [min, max] = bounds[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
      throw new RangeError(`Grinch: ${key} must be between ${min} and ${max}.`);
  }
  for (const key of ['maxGifts', 'zIndex'] as const)
    if (!Number.isInteger(result[key])) throw new TypeError(`Grinch: ${key} must be an integer.`);
  for (const key of ['observe', 'autoSteal', 'controls'] as const)
    if (typeof result[key] !== 'boolean') throw new TypeError(`Grinch: ${key} must be boolean.`);
  if (!['mischievous', 'friendly'].includes(result.mood))
    throw new TypeError('Grinch: invalid mood.');
  if (!['system', 'full', 'none'].includes(result.motion))
    throw new TypeError('Grinch: invalid motion.');
  if (!['sneak', 'rope', 'appear'].includes(result.entrance))
    throw new TypeError('Grinch: invalid entrance.');
  if (!['page', 'root'].includes(result.territory))
    throw new TypeError('Grinch: invalid territory.');
  for (const key of ['furColor', 'coatColor'] as const)
    if (typeof result[key] !== 'string' || !/^#[a-f\d]{6}$/i.test(result[key]))
      throw new TypeError(`Grinch: ${key} must be a six-digit hex color.`);
  selector(result.objects);
  if (
    input.targets !== undefined &&
    typeof input.targets !== 'string' &&
    !Array.isArray(input.targets)
  )
    throw new TypeError('Grinch: targets must be a selector or array of elements.');
  if (typeof input.targets === 'string') selector(input.targets);
  return result;
}
export function validateTuning(patch: GrinchTuning): void {
  if (
    !patch ||
    typeof patch !== 'object' ||
    Array.isArray(patch) ||
    Object.keys(patch).some((k) => !tuningKeys.has(k))
  )
    throw new TypeError('Grinch: update accepts tuning options only.');
}
