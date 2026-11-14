import type { Options } from './options.js';
import type { Box, GiftState, GrinchEvent, GrinchEventData, GrinchPhase, Point } from './types.js';
export const clamp = (n: number, a: number, b: number): number => Math.max(a, Math.min(b, n));
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
export interface Gift {
  id: string;
  position: Point;
  state: GiftState;
  visible: boolean;
  color: string;
  returning: { from: Point; age: number } | null;
  element?: HTMLElement;
}
export interface Shelter {
  id: string;
  box: Box;
}
export interface Actor extends Point {
  phase: GrinchPhase;
  age: number;
  gait: number;
  facing: number;
  behind: boolean;
  visible: boolean;
  destination: Point;
  rope: Point | null;
}
type Emit = (event: GrinchEvent, data: GrinchEventData) => void;
export class Mischief {
  readonly actor: Actor = {
    x: 0,
    y: 0,
    phase: 'idle',
    age: 0,
    gait: 0,
    facing: 1,
    behind: false,
    visible: true,
    destination: { x: 0, y: 0 },
    rope: null,
  };
  gifts: Gift[] = [];
  totalStolen = 0;
  caught = 0;
  time = 0;
  private nextHeist = 1.4;
  private lastCatch = -10;
  private target: Gift | null = null;
  private shelter: Shelter | null = null;
  private initialized = false;
  private afterClimb: 'idle' | 'reaching' = 'reaching';
  constructor(
    private readonly options: Options,
    private readonly emit: Emit = () => {},
  ) {}
  get held(): Gift | undefined {
    return this.gifts.find((g) => g.state === 'held');
  }
  get stolen(): number {
    return this.gifts.filter((g) => g.state === 'stolen').length;
  }
  change(phase: GrinchPhase): void {
    this.actor.phase = phase;
    this.actor.age = 0;
    this.emit('phase', { phase });
  }
  spawn(view: Box, quiet = false): void {
    if (this.initialized || view.width < 1 || view.height < 1) return;
    this.initialized = true;
    const first = this.gifts.find((g) => g.visible);
    const landing = {
      x: clamp(
        (first?.position.x ?? view.x + view.width * 0.65) - 65 * this.options.size,
        view.x + 35,
        view.x + Math.max(36, view.width - 35),
      ),
      y: first?.position.y ?? view.y + view.height * 0.72,
    };
    this.actor.destination = landing;
    if (quiet || this.options.entrance === 'appear') {
      Object.assign(this.actor, landing);
      this.change('idle');
    } else if (this.options.entrance === 'rope') {
      this.actor.x = landing.x;
      this.actor.y = view.y - 130;
      this.actor.rope = { x: landing.x, y: view.y - 20 };
      this.change('arriving');
    } else {
      this.actor.x = view.x - 55;
      this.actor.y = landing.y;
      this.change('arriving');
    }
  }
  settleEntrance(): void {
    if (this.actor.phase === 'arriving') {
      Object.assign(this.actor, this.actor.destination);
      this.actor.rope = null;
      this.change('idle');
    }
  }
  steal(gift?: Gift): boolean {
    if (
      this.options.mood !== 'mischievous' ||
      !['idle', 'waving', 'peeking'].includes(this.actor.phase)
    )
      return false;
    const chosen =
      gift ??
      this.gifts
        .filter(
          (g) => g.visible && g.state === 'available' && distance(g.position, this.actor) < 1200,
        )
        .sort((a, b) => distance(a.position, this.actor) - distance(b.position, this.actor))[0];
    if (!chosen || chosen.state !== 'available' || !chosen.visible) return false;
    this.target = chosen;
    this.actor.behind = false;
    this.actor.rope = null;
    this.change('sneaking');
    this.emit('theft:start', { giftId: chosen.id });
    return true;
  }
  private hand(): Point {
    return {
      x: this.actor.x + this.actor.facing * 23 * this.options.size,
      y: this.actor.y - 51 * this.options.size,
    };
  }
  private sack(): Point {
    return {
      x: this.actor.x - this.actor.facing * 22 * this.options.size,
      y: this.actor.y - 39 * this.options.size,
    };
  }
  giftPoint(gift: Gift): Point {
    const r = gift.returning;
    if (r) {
      const t = clamp(r.age / 0.85, 0, 1),
        ease = t * t * (3 - 2 * t);
      return {
        x: r.from.x + (gift.position.x - r.from.x) * ease,
        y:
          r.from.y +
          (gift.position.y - r.from.y) * ease -
          Math.sin(t * Math.PI) * 65 * this.options.size,
      };
    }
    if (gift.state === 'held') {
      const hand = this.hand();
      if (this.actor.phase === 'stealing') {
        const t = clamp(this.actor.age / 0.65, 0, 1);
        return {
          x: gift.position.x + (hand.x - gift.position.x) * t,
          y: gift.position.y + (hand.y - gift.position.y) * t - Math.sin(t * Math.PI) * 12,
        };
      }
      if (this.actor.phase === 'stashing') {
        const t = clamp(this.actor.age / 0.7, 0, 1),
          sack = this.sack();
        return {
          x: hand.x + (sack.x - hand.x) * t,
          y: hand.y + (sack.y - hand.y) * t - Math.sin(t * Math.PI) * 18,
        };
      }
      return hand;
    }
    return { ...gift.position };
  }
  private returnGift(gift: Gift, immediate = false): void {
    if (gift.state === 'available' || gift.state === 'returning') return;
    const from = gift.state === 'held' ? this.giftPoint(gift) : this.sack();
    gift.state = immediate ? 'available' : 'returning';
    gift.returning = immediate ? null : { from, age: 0 };
    if (immediate) this.emit('gift:returned', { giftId: gift.id });
  }
  returnGifts(immediate = false): void {
    for (const gift of this.gifts) this.returnGift(gift, immediate);
    this.target = null;
    this.actor.rope = null;
    this.nextHeist = this.time + this.options.cooldown;
    if (this.actor.phase !== 'warming') this.change('waving');
  }
  redeem(immediate = false): void {
    this.options.mood = 'friendly';
    this.returnGifts(immediate);
    this.change('warming');
    this.emit('redeemed', {});
    if (immediate) this.change('idle');
  }
  shoo(immediate = false): void {
    if (this.time - this.lastCatch < 1) return;
    const gift = this.held ?? [...this.gifts].reverse().find((g) => g.state === 'stolen');
    if (gift) this.returnGift(gift, immediate);
    this.lastCatch = this.time;
    this.caught++;
    this.target = null;
    this.actor.rope = null;
    this.change('caught');
    this.emit('caught', {});
  }
  wave(): void {
    if (this.held) this.returnGifts();
    this.target = null;
    this.actor.rope = null;
    this.change('waving');
    this.nextHeist = this.time + 3;
  }
  private move(to: Point, dt: number, rate: number): boolean {
    const a = this.actor,
      dx = to.x - a.x,
      dy = to.y - a.y,
      len = Math.hypot(dx, dy),
      travel = Math.min(len, dt * rate * this.options.speed);
    if (Math.abs(dx) > 1) a.facing = dx > 0 ? 1 : -1;
    if (len > 0.01) {
      a.x += (dx / len) * travel;
      a.y += (dy / len) * travel;
      a.gait += travel * 0.11;
    }
    return len < 2;
  }
  private hide(shelters: readonly Shelter[]): void {
    const size = this.options.size;
    this.shelter =
      shelters
        .filter(
          (s) =>
            s.box.height > 155 * size &&
            s.box.width > 80 * size &&
            distance({ x: s.box.x + s.box.width / 2, y: s.box.y + s.box.height / 2 }, this.actor) <
              650,
        )
        .sort((a, b) => distance(a.box, this.actor) - distance(b.box, this.actor))[0] ?? null;
    if (this.shelter) {
      const b = this.shelter.box;
      this.actor.destination = { x: b.x + b.width * 0.5, y: b.y + b.height - 8 };
      this.actor.behind = true;
      this.change('escaping');
    } else {
      this.actor.behind = false;
      this.change('waving');
      this.nextHeist = this.time + this.options.cooldown;
    }
  }
  dispose(): void {
    this.gifts = [];
    this.target = null;
    this.shelter = null;
    this.actor.rope = null;
  }
  step(
    dt: number,
    view: Box,
    shelters: readonly Shelter[],
    pointer: Point | null,
    quiet = false,
  ): void {
    if (!this.initialized) this.spawn(view, quiet);
    if (!this.initialized) return;
    const a = this.actor,
      size = this.options.size;
    a.visible =
      a.x > view.x - 70 &&
      a.x < view.x + view.width + 70 &&
      a.y > view.y - 30 &&
      a.y - 145 * size < view.y + view.height;
    if (quiet) {
      this.settleEntrance();
      return;
    }
    if (!(dt > 0)) return;
    dt = clamp(dt, 0, 0.05);
    this.time += dt;
    this.actor.age += dt;
    for (const gift of this.gifts)
      if (gift.returning) {
        gift.returning.age += dt;
        if (gift.returning.age >= 0.85) {
          gift.returning = null;
          gift.state = 'available';
          this.emit('gift:returned', { giftId: gift.id });
        }
      }
    if (this.shelter) {
      const live = shelters.find((s) => s.id === this.shelter!.id);
      if (live) this.shelter = live;
      else {
        this.shelter = null;
        a.behind = false;
        if (['hiding', 'peeking', 'escaping'].includes(a.phase)) this.change('idle');
      }
    }
    if (
      pointer &&
      this.options.fearRadius > 0 &&
      a.visible &&
      !a.behind &&
      !['caught', 'warming', 'arriving'].includes(a.phase) &&
      this.time - this.lastCatch > 3 &&
      distance({ x: a.x, y: a.y - 60 * size }, pointer) < this.options.fearRadius
    )
      this.shoo();
    if (this.target && !this.gifts.includes(this.target)) {
      this.target = null;
      a.rope = null;
      this.change('idle');
      this.nextHeist = this.time + 2;
    }
    const gift = this.target;
    switch (a.phase) {
      case 'arriving':
        if (this.move(a.destination, dt, this.options.entrance === 'rope' ? 180 : 95)) {
          a.rope = null;
          this.change('waving');
          this.nextHeist = this.time + 1.5;
        }
        break;
      case 'idle':
        if (
          this.options.mood === 'mischievous' &&
          this.options.autoSteal &&
          this.time > this.nextHeist &&
          a.visible
        )
          this.steal();
        else if (this.options.mood === 'friendly' && a.age > 5) this.wave();
        break;
      case 'sneaking':
      case 'climbing': {
        if (!gift && this.afterClimb === 'idle' && a.phase === 'climbing') {
          if (this.move(a.destination, dt, 95)) {
            a.rope = null;
            a.behind = false;
            this.change('idle');
          }
          break;
        }
        if (!gift || !gift.visible || gift.state !== 'available') {
          this.target = null;
          a.rope = null;
          this.change('idle');
          this.nextHeist = this.time + 2;
          break;
        }
        const side = gift.position.x >= a.x ? 1 : -1;
        const to = { x: gift.position.x - side * 28 * size, y: gift.position.y };
        if (a.phase === 'sneaking' && Math.abs(to.y - a.y) > 32) {
          if (Math.abs(to.x - a.x) > 65 * size) this.move({ x: to.x, y: a.y }, dt, 80);
          else {
            this.afterClimb = 'reaching';
            a.rope = { x: to.x, y: to.y - 8 };
            this.change('climbing');
          }
        } else if (this.move(to, dt, a.phase === 'climbing' ? 105 : 80)) {
          a.facing = gift.position.x >= a.x ? 1 : -1;
          a.rope = null;
          this.change('reaching');
        }
        break;
      }
      case 'reaching':
        if (!gift || !gift.visible || gift.state !== 'available') {
          this.target = null;
          this.change('idle');
        } else if (
          distance(a, { x: gift.position.x - a.facing * 28 * size, y: gift.position.y }) >
          20 * size
        )
          this.change('sneaking');
        else if (a.age > 0.55) {
          gift.state = 'held';
          this.change('stealing');
        }
        break;
      case 'stealing':
        if (a.age > 0.65) this.change('stashing');
        break;
      case 'stashing':
        if (a.age > 0.7 && gift?.state === 'held') {
          gift.state = 'stolen';
          this.totalStolen++;
          this.nextHeist = this.time + this.options.cooldown;
          this.emit('gift:stolen', { giftId: gift.id, totalStolen: this.totalStolen });
          this.target = null;
          this.change('gloating');
        }
        break;
      case 'gloating':
        if (a.age > 1.0) this.hide(shelters);
        break;
      case 'caught':
        if (a.age > 1.1) this.hide(shelters);
        break;
      case 'escaping':
        if (this.shelter) {
          const b = this.shelter.box;
          a.destination = { x: b.x + b.width * 0.5, y: b.y + b.height - 8 };
          if (this.move(a.destination, dt, 155)) this.change('hiding');
        } else this.change('idle');
        break;
      case 'hiding':
        if (a.age > 1.0) this.change('peeking');
        break;
      case 'peeking':
        if (this.shelter) {
          const b = this.shelter.box,
            to = { x: b.x - 14 * size, y: b.y + b.height - 8 };
          if (this.move(to, dt, 95) && a.age > 2.5) {
            a.destination = { x: to.x, y: b.y };
            a.rope = { x: to.x, y: b.y };
            this.afterClimb = 'idle';
            this.target = null;
            this.change('climbing');
          }
        } else this.change('idle');
        break;
      case 'warming':
        if (a.age > 2.0) {
          a.behind = false;
          this.change('waving');
        }
        break;
      case 'waving':
        if (a.age > 1.35) this.change('idle');
        break;
    }
  }
}
