// The little vehicles on the street (Phase 32): a car, a scooter and a bike, each drawn once facing up and
// turned to face the other three ways. Pixel art in the town's own palette. Cached by kind, colour and way.

import { makeCanvas } from '../engine/sprites.js';
import { KINDS } from '../game/vehicles.js';

const INK = '#0c0d12', GLASS = '#1c2a30', GLASS_LIT = '#2a3e46', HEAD = '#f6d48a', TAIL = '#8a2a2a', RUBBER = '#16181e', SKIN = '#c9a07a';

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
};

const PAINT = {
  // 14 x 28, front at the top
  car(g, col) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    R(1, 1, 12, 27, INK); R(2, 2, 10, 25, col);
    R(0, 5, 1, 5, RUBBER); R(13, 5, 1, 5, RUBBER); R(0, 19, 1, 5, RUBBER); R(13, 19, 1, 5, RUBBER);       // wheels
    R(2, 2, 10, 4, shade(col, 1.12));                                                                       // bonnet
    R(3, 8, 8, 4, GLASS); R(4, 9, 3, 1, GLASS_LIT);                                                         // windscreen
    R(2, 12, 10, 7, shade(col, 1.2)); R(2, 12, 10, 1, shade(col, 0.8));                                     // roof
    R(3, 20, 8, 3, GLASS);                                                                                  // rear window
    R(2, 2, 3, 2, HEAD); R(9, 2, 3, 2, HEAD);                                                               // headlights
    R(2, 25, 3, 1, TAIL); R(9, 25, 3, 1, TAIL);                                                             // tail lights
  },
  // 8 x 16: a scooter and its rider
  scooter(g, col) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    R(3, 0, 2, 3, RUBBER); R(3, 13, 2, 3, RUBBER);                                                          // wheels
    R(3, 3, 2, 10, '#5a5f6e'); R(2, 8, 4, 3, shade('#5a5f6e', 0.8));                                       // the body
    R(1, 4, 6, 1, INK); R(0, 4, 1, 1, INK); R(7, 4, 1, 1, INK);                                            // handlebars
    R(2, 5, 4, 5, col); R(3, 5, 2, 1, shade(col, 1.25));                                                    // rider's back and shoulders
    R(3, 6, 2, 2, SKIN); R(3, 6, 2, 1, INK);                                                                // head and hair
    R(3, 0, 2, 1, HEAD);
  },
  // 6 x 14: a bicycle and its rider
  bike(g, col) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    R(2, 0, 2, 3, RUBBER); R(2, 11, 2, 3, RUBBER);
    R(2, 3, 2, 8, '#6a6f7e');
    R(0, 3, 6, 1, INK);
    R(1, 4, 4, 4, col); R(2, 4, 2, 1, shade(col, 1.25));
    R(2, 5, 2, 2, SKIN); R(2, 5, 2, 1, INK);
  },
};

const cache = new Map();
// A canvas of the vehicle facing `dir` ('up' | 'right' | 'down' | 'left').
export function vehicleSprite(kind, color, dir) {
  const key = `${kind}:${color}:${dir}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const K = KINDS[kind], up = makeCanvas(K.w, K.h), g = up.getContext('2d');
  PAINT[kind](g, color);
  const turn = { up: 0, right: 1, down: 2, left: 3 }[dir] ?? 0;
  if (!turn) cv = up;
  else {
    const sideways = turn % 2 === 1;
    cv = makeCanvas(sideways ? K.h : K.w, sideways ? K.w : K.h);
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.translate(cv.width / 2, cv.height / 2); c.rotate(turn * Math.PI / 2); c.drawImage(up, -K.w / 2, -K.h / 2);
  }
  cache.set(key, cv);
  return cv;
}
