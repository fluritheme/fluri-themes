export interface Point {
  x: number;
  y: number;
}
export interface Box extends Point {
  width: number;
  height: number;
}
export type GrinchMood = 'mischievous' | 'friendly';
export type GrinchPhase =
  | 'arriving'
  | 'idle'
  | 'sneaking'
  | 'climbing'
  | 'reaching'
  | 'stealing'
  | 'stashing'
  | 'gloating'
  | 'escaping'
  | 'hiding'
  | 'peeking'
  | 'caught'
  | 'warming'
  | 'waving';
export type GiftState = 'available' | 'held' | 'stolen' | 'returning';
export type GrinchEvent =
  | 'ready'
  | 'phase'
  | 'theft:start'
  | 'gift:stolen'
  | 'gift:returned'
  | 'caught'
  | 'redeemed'
  | 'error';
export interface GrinchOptions {
  /** Current document or an element. No DOM is touched during server rendering. */
  root?: Document | HTMLElement;
  /** Gift-bearing elements; defaults to [data-grinch-gift], then a few real page surfaces. */
  targets?: string | readonly HTMLElement[];
  territory?: 'page' | 'root';
  /** A selector for places to hide; at most 64 are measured. */
  objects?: string;
  /** Maximum illustrated presents, 1–12. Host content is never removed or moved. */
  maxGifts?: number;
  /** Character scale, .6–1.8; mobileScale applies below 600px. */
  size?: number;
  mobileScale?: number;
  speed?: number;
  /** Seconds between heists, 3–120. */
  cooldown?: number;
  fearRadius?: number;
  mood?: GrinchMood;
  autoSteal?: boolean;
  entrance?: 'sneak' | 'rope' | 'appear';
  motion?: 'system' | 'full' | 'none';
  observe?: boolean;
  zIndex?: number;
  furColor?: string;
  coatColor?: string;
  /** Optional small visitor pause control. Default false. */
  controls?: boolean;
}
export type GrinchTuning = Pick<
  GrinchOptions,
  | 'size'
  | 'mobileScale'
  | 'speed'
  | 'cooldown'
  | 'fearRadius'
  | 'mood'
  | 'autoSteal'
  | 'furColor'
  | 'coatColor'
>;
export interface GrinchSnapshot {
  readonly state: 'idle' | 'running' | 'paused' | 'destroyed';
  readonly reducedMotion: boolean;
  readonly mood: GrinchMood;
  readonly phase: GrinchPhase;
  /** Character feet in document CSS coordinates. */
  readonly character: Readonly<
    Point & { visible: boolean; behind: boolean; facing: number }
  > | null;
  readonly gifts: readonly Readonly<Point & { id: string; state: GiftState; visible: boolean }>[];
  readonly stolen: number;
  readonly totalStolen: number;
  readonly caught: number;
}
export interface GrinchEventData {
  readonly phase?: GrinchPhase;
  readonly giftId?: string;
  readonly totalStolen?: number;
  readonly source?: string;
}
export interface GrinchController {
  /** Queue a heist; optional selector must match an existing gift-bearing element. */
  steal(selector?: string): boolean;
  /** Startle him and return one held/stolen present. */
  shoo(): void;
  /** Send stolen presents back to their live page anchors. */
  returnGifts(): void;
  /** Grow a little heart, return all presents, and switch to friendly mode. */
  redeem(): void;
  wave(): void;
  update(options: GrinchTuning): void;
  refresh(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  getState(): GrinchSnapshot;
  on(event: GrinchEvent, callback: (data: GrinchEventData) => void): () => void;
}
