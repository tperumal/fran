#!/usr/bin/env node
// Generate FRAN splash screen and App Store screenshots
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const WHITE = '#ffffff';
const BLACK = '#000000';
const MUTED = '#555555';
const DIM = '#999999';
const ACCENT = '#0038FF';
const BORDER_LIGHT = '#d0d0d0';

// --- Splash Screen (2732x2732) ---
function generateSplash() {
  const size = 2732;
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, size, size);

  // "FRAN" text
  ctx.fillStyle = BLACK;
  ctx.font = '900 200px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '24px';
  ctx.fillText('FRAN', size / 2, size / 2 - 40);

  // Subtitle
  ctx.fillStyle = MUTED;
  ctx.font = '400 48px "Courier New", monospace';
  ctx.letterSpacing = '12px';
  ctx.fillText('YOUR LIFE, ORGANIZED', size / 2, size / 2 + 70);

  return c;
}

// --- Screenshot helpers ---
function drawStatusBar(ctx, w, device) {
  ctx.fillStyle = BLACK;
  ctx.font = `600 ${device.statusH * 0.45}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  const y = device.statusH * 0.5;
  ctx.textAlign = 'left';
  ctx.fillText('9:41', 50, y);
  ctx.textAlign = 'right';
  ctx.fillText('100%', w - 50, y);
}

function drawHeader(ctx, w, device, title) {
  const y = device.statusH;
  const h = device.headerH;

  // Header bar
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, y, w, h);
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y + h);
  ctx.lineTo(w, y + h);
  ctx.stroke();

  // Title
  ctx.fillStyle = BLACK;
  ctx.font = `900 ${h * 0.35}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '3px';
  ctx.fillText(title, 40, y + h / 2);
}

function drawNavBar(ctx, w, h, device, activeIdx) {
  const navY = h - device.navH;
  const labels = ['TASKS', 'FITNESS', 'MEALS', 'CAREER'];

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, navY, w, device.navH);
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, navY);
  ctx.lineTo(w, navY);
  ctx.stroke();

  const itemW = w / labels.length;
  labels.forEach((label, i) => {
    const x = i * itemW;
    const cx = x + itemW / 2;

    // Separator
    if (i > 0) {
      ctx.strokeStyle = BORDER_LIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, navY + 10);
      ctx.lineTo(x, h - 10);
      ctx.stroke();
    }

    // Active state
    if (i === activeIdx) {
      ctx.fillStyle = BLACK;
      ctx.fillRect(x, navY, itemW, device.navH);
      ctx.fillStyle = WHITE;
    } else {
      ctx.fillStyle = MUTED;
    }

    // Icon placeholder (small square)
    const iconSize = 20;
    ctx.strokeStyle = i === activeIdx ? WHITE : MUTED;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - iconSize/2, navY + 14, iconSize, iconSize);

    // Label
    ctx.font = `700 ${11}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, cx, navY + 40);
  });
}

function drawCard(ctx, x, y, w, h, title, items) {
  // Card border
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Card title
  ctx.fillStyle = MUTED;
  ctx.font = '700 13px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.letterSpacing = '2px';
  ctx.fillText(title, x + 16, y + 14);

  // Items
  if (items) {
    items.forEach((item, i) => {
      const iy = y + 42 + i * 32;
      if (iy + 20 > y + h) return;

      // Checkbox
      ctx.strokeStyle = item.done ? BLACK : BORDER_LIGHT;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 16, iy, 18, 18);
      if (item.done) {
        ctx.fillStyle = BLACK;
        ctx.fillRect(x + 16, iy, 18, 18);
      }

      // Label
      ctx.fillStyle = item.done ? DIM : BLACK;
      ctx.font = `400 15px "Helvetica Neue", Arial, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, x + 44, iy + 9);
    });
  }
}

// --- DASHBOARD SCREENSHOT ---
function drawDashboard(w, h, device) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  drawStatusBar(ctx, w, device);
  drawHeader(ctx, w, device, 'FRAN');
  drawNavBar(ctx, w, h, device, -1);

  const contentTop = device.statusH + device.headerH + 20;
  const cardW = (w - 80) / 2;
  const cardH = 200;
  const gap = 16;

  // Module cards grid
  const modules = ['TASKS', 'FITNESS', 'MEALS', 'CAREER', 'MONEY', 'HOBBIES'];
  modules.forEach((mod, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 30 + col * (cardW + gap);
    const cy = contentTop + row * (cardH + gap);

    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cardW, cardH);

    ctx.fillStyle = BLACK;
    ctx.font = '900 18px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '2px';
    ctx.fillText(mod, cx + 16, cy + 16);

    // Fake content lines
    ctx.fillStyle = BORDER_LIGHT;
    for (let j = 0; j < 3; j++) {
      ctx.fillRect(cx + 16, cy + 52 + j * 24, cardW * 0.7 - Math.random() * 60, 10);
    }
  });

  return c;
}

// --- TASKS SCREENSHOT ---
function drawTasks(w, h, device) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  drawStatusBar(ctx, w, device);
  drawHeader(ctx, w, device, 'TASKS');
  drawNavBar(ctx, w, h, device, 0);

  const contentTop = device.statusH + device.headerH + 20;
  const cardW = w - 60;

  const tasks = [
    { label: 'Review quarterly budget', done: true },
    { label: 'Schedule dentist appointment', done: false },
    { label: 'Submit tax documents', done: true },
    { label: 'Book flights for June trip', done: false },
    { label: 'Renew car insurance', done: false },
    { label: 'Update portfolio site', done: true },
  ];

  drawCard(ctx, 30, contentTop, cardW, 280, 'TODAY', tasks);

  const upcoming = [
    { label: 'Weekly meal prep', done: false },
    { label: 'Call mom', done: false },
    { label: 'Oil change', done: false },
  ];

  drawCard(ctx, 30, contentTop + 300, cardW, 180, 'THIS WEEK', upcoming);

  return c;
}

// --- FITNESS SCREENSHOT ---
function drawFitness(w, h, device) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  drawStatusBar(ctx, w, device);
  drawHeader(ctx, w, device, 'FITNESS');
  drawNavBar(ctx, w, h, device, 1);

  const contentTop = device.statusH + device.headerH + 20;
  const cardW = w - 60;

  // Stats row
  const statW = (cardW - 32) / 3;
  const stats = [
    { label: 'WORKOUTS', value: '4' },
    { label: 'STREAK', value: '12' },
    { label: 'THIS WEEK', value: '3/5' },
  ];

  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 2;
  ctx.strokeRect(30, contentTop, cardW, 100);

  stats.forEach((stat, i) => {
    const sx = 30 + 16 + i * statW;

    if (i > 0) {
      ctx.strokeStyle = BORDER_LIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30 + i * statW + 16, contentTop + 15);
      ctx.lineTo(30 + i * statW + 16, contentTop + 85);
      ctx.stroke();
    }

    ctx.fillStyle = BLACK;
    ctx.font = '900 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.value, sx + statW / 2, contentTop + 42);

    ctx.fillStyle = MUTED;
    ctx.font = '700 10px "Courier New", monospace';
    ctx.letterSpacing = '2px';
    ctx.fillText(stat.label, sx + statW / 2, contentTop + 75);
  });

  // Recent workouts
  const workouts = [
    { label: 'Upper body — 45 min', done: true },
    { label: 'Morning run — 30 min', done: true },
    { label: 'Yoga flow — 20 min', done: true },
    { label: 'Leg day — 50 min', done: false },
  ];

  drawCard(ctx, 30, contentTop + 120, cardW, 220, 'RECENT WORKOUTS', workouts);

  return c;
}

// --- MONEY SCREENSHOT ---
function drawMoney(w, h, device) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);

  drawStatusBar(ctx, w, device);
  drawHeader(ctx, w, device, 'MONEY');
  drawNavBar(ctx, w, h, device, -1);

  const contentTop = device.statusH + device.headerH + 20;
  const cardW = w - 60;

  // Bills card
  const bills = [
    { label: 'Rent — $2,450', done: true },
    { label: 'Electric — $128', done: false },
    { label: 'Internet — $75', done: true },
    { label: 'Insurance — $340', done: false },
    { label: 'Phone — $85', done: false },
  ];

  drawCard(ctx, 30, contentTop, cardW, 240, 'BILLS THIS MONTH', bills);

  // Summary
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 2;
  ctx.strokeRect(30, contentTop + 260, cardW, 120);

  ctx.fillStyle = MUTED;
  ctx.font = '700 13px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.letterSpacing = '2px';
  ctx.fillText('SUMMARY', 46, contentTop + 274);

  ctx.fillStyle = BLACK;
  ctx.font = '900 36px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText('$3,078', 46, contentTop + 330);

  ctx.fillStyle = MUTED;
  ctx.font = '400 14px "Courier New", monospace';
  ctx.fillText('2 OF 5 PAID', 46, contentTop + 360);

  return c;
}

// --- Generate ---
const DEVICES = {
  iphone_67: { w: 1290, h: 2796, statusH: 110, headerH: 100, navH: 90 },
  ipad_13:   { w: 2064, h: 2752, statusH: 80, headerH: 100, navH: 90 },
};

const screens = [
  { name: 'dashboard', fn: drawDashboard },
  { name: 'tasks', fn: drawTasks },
  { name: 'fitness', fn: drawFitness },
  { name: 'money', fn: drawMoney },
];

fs.mkdirSync('screenshots', { recursive: true });

for (const [deviceName, device] of Object.entries(DEVICES)) {
  for (const screen of screens) {
    const canvas = screen.fn(device.w, device.h, device);
    const filename = `screenshots/${deviceName}_${screen.name}.png`;
    fs.writeFileSync(filename, canvas.toBuffer('image/png'));
    console.log(`  ${filename} (${device.w}x${device.h})`);
  }
}

// Splash
const splashCanvas = generateSplash();
const splashPng = splashCanvas.toBuffer('image/png');
const splashDir = 'ios/App/App/Assets.xcassets/Splash.imageset';
fs.writeFileSync(path.join(splashDir, 'splash-2732x2732.png'), splashPng);
fs.writeFileSync(path.join(splashDir, 'splash-2732x2732-1.png'), splashPng);
fs.writeFileSync(path.join(splashDir, 'splash-2732x2732-2.png'), splashPng);
console.log('  Splash screens (2732x2732)');

console.log('\nDone.');
