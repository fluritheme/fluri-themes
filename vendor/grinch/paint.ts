import type { Options } from './options.js';
import { clamp, type Mischief, type Gift } from './model.js';
import type { Point } from './types.js';
const TAU = Math.PI * 2;
export function paintGift(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  size = 1,
  scale = 1,
): void {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.scale(size * scale, size * scale);
  ctx.lineWidth = 0.8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#253222';
  ctx.fillStyle = '#15251d25';
  ctx.beginPath();
  ctx.ellipse(0, 1, 14, 2.7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-12, -22, 24, 22, 2.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff3ce';
  ctx.fillRect(-2.2, -22, 4.4, 22);
  ctx.fillRect(-12, -15, 24, 3.5);
  ctx.strokeStyle = '#d0aa54';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.bezierCurveTo(-18, -37, -15, -17, 0, -23);
  ctx.bezierCurveTo(18, -37, 15, -17, 0, -23);
  ctx.stroke();
  ctx.fillStyle = '#fff3ce';
  ctx.beginPath();
  ctx.arc(0, -23, 2.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function heart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-15, -5, -9, -16, 0, -8);
  ctx.bezierCurveTo(9, -16, 15, -5, 0, 3);
  ctx.fill();
  ctx.restore();
}
/** Original procedural character artwork, with expressive poses instead of downloaded sprites. */
export function paintGrinch(
  ctx: CanvasRenderingContext2D,
  model: Mischief,
  options: Options,
  quiet: boolean,
): void {
  const a = model.actor,
    size = options.size,
    phase = a.phase,
    t = model.time,
    age = a.age;
  const walking = ['arriving', 'sneaking', 'escaping', 'peeking'].includes(phase),
    climbing = phase === 'climbing' || (phase === 'arriving' && options.entrance === 'rope');
  const caught = phase === 'caught',
    warm = phase === 'warming',
    nice = options.mood === 'friendly';
  const reach = ['reaching', 'stealing'].includes(phase),
    stash = phase === 'stashing',
    wave = phase === 'waving',
    gloat = phase === 'gloating';
  const bob = quiet
    ? 0
    : walking
      ? Math.sin(a.gait * 2) * 1.5
      : climbing
        ? Math.sin(a.gait) * 1.5
        : Math.sin(t * 2.2) * 0.6;
  if (a.rope) {
    ctx.save();
    ctx.strokeStyle = '#29402a65';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(a.rope.x, a.rope.y);
    ctx.quadraticCurveTo(
      a.rope.x - 5,
      (a.rope.y + a.y) / 2,
      a.x + a.facing * 16 * size,
      a.y - 73 * size,
    );
    ctx.stroke();
    ctx.strokeStyle = '#fff6db';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(a.x, a.y + bob);
  ctx.scale(size * a.facing, size);
  const stroke = '#23351d',
    fur = options.furColor,
    furLight = '#b3d85a',
    red = options.coatColor,
    cream = '#fff5de';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    fill: string,
    line = stroke,
  ): void => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = line;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    if (line !== 'none') ctx.stroke();
  };
  const path = (fill: string, draw: () => void, line = stroke, width = 1): void => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = line;
    ctx.lineWidth = width;
    ctx.beginPath();
    draw();
    ctx.fill();
    if (line !== 'none') ctx.stroke();
  };
  const limb = (
    x: number,
    y: number,
    tx: number,
    ty: number,
    width: number,
    fill: string,
  ): void => {
    ctx.lineWidth = width + 1.3;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + tx) / 2 - 3, (y + ty) / 2 + 5, tx, ty);
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = fill;
    ctx.stroke();
  };
  ctx.save();
  ctx.globalAlpha = 0.15;
  ellipse(0, 0 - bob, 25, 3, '#0c1911', 'none');
  ctx.restore();
  // Sack follows the shoulder and gets rounder as illustrated presents are stashed.
  const fullness = Math.min(3, model.stolen + (model.held ? 0.3 : 0));
  path('#7e5438', () => {
    ctx.moveTo(-20, -65);
    ctx.bezierCurveTo(-45 - fullness * 2, -62, -43 - fullness * 3, -25, -26, -24);
    ctx.bezierCurveTo(-8, -22, -7, -52, -20, -65);
  });
  ctx.strokeStyle = '#bb9160';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-27, -55);
  ctx.quadraticCurveTo(-35, -43, -28, -30);
  ctx.stroke();
  ctx.strokeStyle = cream;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-25, -61);
  ctx.lineTo(-14, -64);
  ctx.stroke();
  // Planted feet and alternating knee bends make the walk feel deliberately sneaky.
  const step = quiet ? 0 : Math.sin(a.gait) * (walking ? 9 : climbing ? 6 : 0);
  limb(-7, -27, -9 - step, -5, 5.8, fur);
  limb(8, -27, 9 + step, -5, 5.8, fur);
  path('#263529', () => {
    ctx.moveTo(-12 - step, -9);
    ctx.quadraticCurveTo(-24 - step, -5, -21 - step, -1);
    ctx.lineTo(-3 - step, -1);
    ctx.quadraticCurveTo(0 - step, -4, -5 - step, -7);
  });
  path('#263529', () => {
    ctx.moveTo(6 + step, -9);
    ctx.quadraticCurveTo(21 + step, -4, 22 + step, -10);
    ctx.quadraticCurveTo(31 + step, 1, 8 + step, 0);
    ctx.lineTo(3 + step, -3);
  });
  // A pear-shaped Santa coat with a soft fur hem and narrow belt.
  path(red, () => {
    ctx.moveTo(-12, -66);
    ctx.bezierCurveTo(-22, -58, -25, -42, -23, -30);
    ctx.quadraticCurveTo(0, -18, 22, -30);
    ctx.bezierCurveTo(22, -45, 18, -61, 10, -66);
    ctx.closePath();
  });
  ctx.strokeStyle = '#ef7180';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(12, -55);
  ctx.quadraticCurveTo(17, -45, 16, -35);
  ctx.stroke();
  path(cream, () => {
    ctx.moveTo(-23, -33);
    for (let x = -23; x < 22; x += 5) ctx.quadraticCurveTo(x + 2, -26, x + 5, -30);
    ctx.lineTo(22, -24);
    ctx.quadraticCurveTo(0, -17, -23, -25);
    ctx.closePath();
  });
  ctx.fillStyle = '#f9edcd';
  ctx.beginPath();
  ctx.roundRect(-2, -60, 4, 32, 1);
  ctx.fill();
  path('#263529', () => {
    ctx.moveTo(-23, -40);
    ctx.quadraticCurveTo(0, -34, 22, -40);
    ctx.lineTo(22, -34);
    ctx.quadraticCurveTo(0, -28, -23, -34);
    ctx.closePath();
  });
  ctx.strokeStyle = '#edc565';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-4, -39, 10, 8, 1);
  ctx.stroke();
  // Thin arms, furry cuffs and long fingers have pose-specific targets.
  let left = { x: -24, y: -42 },
    right = { x: 23, y: -43 };
  if (reach) {
    right = { x: 28, y: -46 + Math.min(1, age / 0.55) * 32 };
    left = { x: -16, y: -48 };
  }
  if (phase === 'stealing') right = { x: 23, y: -14 - clamp(age / 0.65, 0, 1) * 37 };
  if (stash) {
    const p = clamp(age / 0.7, 0, 1);
    right = { x: 23 - 44 * p, y: -51 - Math.sin(p * Math.PI) * 15 };
    left = { x: -24, y: -60 };
  }
  if (caught) {
    left = { x: -28, y: -79 };
    right = { x: 28, y: -79 };
  }
  if (wave) {
    right = { x: 27 + (quiet ? 0 : Math.sin(age * 12) * 4), y: -83 };
  }
  if (gloat) {
    left = { x: -13, y: -46 };
    right = { x: 16, y: -50 };
  }
  if (climbing) {
    left = { x: -13, y: -83 + Math.sin(a.gait) * 8 };
    right = { x: 16, y: -84 - Math.sin(a.gait) * 8 };
  }
  if (warm) {
    left = { x: -8, y: -55 };
    right = { x: 9, y: -55 };
  }
  for (const [side, hand] of [
    [-1, left],
    [1, right],
  ] as const) {
    limb(side * 14, -60, hand.x, hand.y, 7, red);
    ellipse(hand.x, hand.y + 2, 5.8, 4.3, cream);
    ellipse(hand.x, hand.y - 3, 5.1, 6, fur);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    for (let f = 0; f < 3; f++) {
      ctx.beginPath();
      ctx.moveTo(hand.x - 3 + f * 2.6, hand.y - 5);
      ctx.lineTo(hand.x - 4 + f * 3, hand.y - 10 + f * 0.7);
      ctx.stroke();
    }
  }
  // Broad fluffy cheeks, tapering chin and an asymmetric grin.
  path(fur, () => {
    ctx.moveTo(-9, -65);
    ctx.quadraticCurveTo(-12, -74, -18, -76);
    ctx.lineTo(-28, -80);
    ctx.lineTo(-23, -84);
    ctx.lineTo(-31, -89);
    ctx.lineTo(-23, -91);
    ctx.quadraticCurveTo(-27, -109, -10, -115);
    ctx.lineTo(-12, -121);
    ctx.lineTo(-5, -118);
    ctx.lineTo(1, -124);
    ctx.lineTo(4, -117);
    ctx.lineTo(12, -122);
    ctx.lineTo(11, -115);
    ctx.quadraticCurveTo(27, -108, 23, -92);
    ctx.lineTo(31, -90);
    ctx.lineTo(24, -85);
    ctx.lineTo(29, -81);
    ctx.lineTo(18, -77);
    ctx.quadraticCurveTo(11, -72, 8, -65);
    ctx.quadraticCurveTo(0, -61, -9, -65);
  });
  ctx.strokeStyle = furLight;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-23, -89);
  ctx.quadraticCurveTo(-18, -84, -14, -85);
  ctx.moveTo(16, -83);
  ctx.quadraticCurveTo(21, -83, 25, -87);
  ctx.stroke();
  const blink = quiet ? 1 : Math.sin(t * 1.37) > 0.995 ? 0.12 : 1;
  for (const side of [-1, 1]) {
    ellipse(side * 9, -98, 7.1, 4.8 * blink, caught ? '#fff4b5' : '#e8ce51');
    ellipse(side * 9 + (nice ? 0 : 1.2), -98, 1.7, (caught ? 3.5 : 2.8) * blink, '#19281d', 'none');
    ellipse(side * 9 + 0.5, -99.1, 0.55, 0.8 * blink, '#fff7d9', 'none');
  }
  // Eyebrows soften when redeemed and lift sharply when caught.
  ctx.strokeStyle = '#26371b';
  ctx.lineWidth = 2.3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 17, -105 - (caught ? 4 : 0));
    ctx.quadraticCurveTo(
      side * 10,
      nice ? -111 : caught ? -113 : -104,
      side * 3,
      -104 + (nice ? -3 : 2),
    );
    ctx.stroke();
  }
  ellipse(1, -91, 4.5, 2.3, '#5a8f2c', 'none');
  ctx.strokeStyle = '#26371b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (caught) {
    ctx.ellipse(1, -80, 3, 4, 0, 0, TAU);
  } else {
    ctx.moveTo(-17, -85);
    ctx.bezierCurveTo(-10, -72, 9, nice ? -70 : -75, 19, -88);
    ctx.moveTo(-18, -86);
    ctx.quadraticCurveTo(-20, -82, -19, -80);
    ctx.moveTo(19, -89);
    ctx.quadraticCurveTo(23, -87, 21, -83);
  }
  ctx.stroke();
  if (!caught) {
    ctx.strokeStyle = furLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, -77);
    ctx.quadraticCurveTo(1, -73, 7, -78);
    ctx.stroke();
  }
  // A soft bent hat with the little bobble clearly separated from the face.
  path(red, () => {
    ctx.moveTo(-22, -110);
    ctx.quadraticCurveTo(-21, -137, 2, -141);
    ctx.bezierCurveTo(23, -148, 33, -137, 29, -126);
    ctx.quadraticCurveTo(21, -133, 15, -125);
    ctx.lineTo(20, -111);
    ctx.closePath();
  });
  path(cream, () => {
    ctx.moveTo(-24, -114);
    for (let x = -24; x < 21; x += 5) ctx.quadraticCurveTo(x + 2, -118, x + 5, -114);
    ctx.lineTo(23, -107);
    ctx.quadraticCurveTo(0, -102, -24, -108);
    ctx.closePath();
  });
  ellipse(30, -124, 7, 7.5, cream);
  ctx.strokeStyle = '#ef7c86';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-12, -124);
  ctx.quadraticCurveTo(-3, -136, 9, -135);
  ctx.stroke();
  if (warm) {
    const p = clamp(age / 1.7, 0, 1);
    heart(ctx, 0, -57, 0.6 + Math.sin(p * Math.PI) * 0.35, '#f1a9a5');
    for (let i = 0; i < 3; i++)
      heart(
        ctx,
        -27 + i * 27,
        -100 - p * 55 + (i % 2) * 12,
        (0.35 + i * 0.1) * Math.sin(p * Math.PI),
        '#e74462',
      );
  }
  ctx.restore();
}
export function paintPresents(
  ctx: CanvasRenderingContext2D,
  model: Mischief,
  size: number,
  held: boolean,
): void {
  for (const gift of model.gifts) {
    if (gift.state === 'stolen') continue;
    const isHeld = gift.state === 'held';
    if (isHeld !== held) continue;
    if (!gift.visible && !isHeld && !gift.returning) continue;
    let scale = 1;
    if (isHeld && model.actor.phase === 'stashing')
      scale = 1 - clamp(model.actor.age / 0.7, 0, 1) * 0.75;
    paintGift(ctx, model.giftPoint(gift), gift.color, size * 0.86, scale);
  }
}
export function giftColor(index: number): string {
  return ['#c92c42', '#71a540', '#d99a39', '#499286', '#c67589'][index % 5]!;
}
