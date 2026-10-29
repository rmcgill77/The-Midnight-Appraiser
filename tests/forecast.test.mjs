// Tests for how the weather is described. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtTemp, fmtWind, compass, windWord, trendWord, summary, forecastView } from '../src/game/forecast.js';
import { typeAt } from '../src/game/climate.js';

test('temperatures in Celsius or Fahrenheit', () => {
  assert.equal(fmtTemp(0), '0°C'); assert.equal(fmtTemp(21.6), '22°C'); assert.equal(fmtTemp(-4.2), '-4°C');
  assert.equal(fmtTemp(0, 'f'), '32°F'); assert.equal(fmtTemp(100, 'f'), '212°F'); assert.equal(fmtTemp(-40, 'f'), '-40°F');
});

test('wind in km/h or mph, and the compass point it comes from', () => {
  assert.equal(fmtWind(10), '36 km/h'); assert.equal(fmtWind(10, 'f'), '22 mph');
  assert.equal(compass(0), 'N'); assert.equal(compass(90), 'E'); assert.equal(compass(225), 'SW'); assert.equal(compass(359), 'N'); assert.equal(compass(-90), 'W');
});

test('words for the wind and the pressure', () => {
  assert.deepEqual([0.5, 3, 7, 11, 20].map(windWord), ['Calm', 'Light breeze', 'Breezy', 'Windy', 'Gale']);
  assert.deepEqual([-5, -1.5, 0, 1.5, 4].map(trendWord), ['Falling fast', 'Falling', 'Steady', 'Rising', 'Rising fast']);
});

test('the summary says what is coming', () => {
  const later = (...types) => [3, 6, 12, 24].map((hours, i) => ({ hours, type: types[i] ?? types[types.length - 1] }));
  assert.match(summary(-2, 'clear', later('clear', 'rain', 'rain', 'clear')), /Rain is on the way.*pressure is falling.*6 hours/);
  assert.match(summary(0, 'overcast', later('overcast', 'overcast', 'storm', 'clear')), /A storm is on the way.*12 hours/);
  assert.match(summary(0, 'rain', later('rain', 'clear', 'clear', 'clear')), /ease off in about 6 hours/);
  assert.match(summary(0, 'rain', later('rain')), /set in for a while/);
  assert.match(summary(-4, 'clear', later('clear')), /dropping fast/);
  assert.match(summary(0, 'clear', later('clear')), /Nothing much/);
});

test('the view has the current weather and the outlook, in the unit asked for', () => {
  const v = forecastView(3, 5 * 1440 + 15 * 60, { month: 8 }), f = forecastView(3, 5 * 1440 + 15 * 60, { month: 8 }, 'f');
  assert.equal(v.type, typeAt(3, 5 * 1440 + 15 * 60, { month: 8 }));
  assert.match(v.temp, /^-?\d+°C$/); assert.match(f.temp, /^-?\d+°F$/);
  assert.match(v.humidity, /^\d+%$/); assert.match(v.pressure, /^\d+ hPa$/);
  assert.match(v.wind, /(km\/h)$/); assert.match(f.wind, /(mph)$/);
  assert.deepEqual(v.later.map(l => l.hours), [3, 6, 12, 24]);
  assert.ok(v.later.every(l => /°C$/.test(l.temp)));
  assert.ok(v.summary.length > 10);
});
