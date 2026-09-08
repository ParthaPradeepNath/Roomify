const sharp = require("sharp");
const fs = require("fs");

// ---- helpers -------------------------------------------------------------
const WALL = "#2b2b2b";
const WALL_LIGHT = "#4a4a4a";
const FURN = "#6b7280";
const TEXT = "#9ca3af";
const BG = "#f7f4ee";

function rect(x, y, w, h, fill = "none", stroke = "#000", sw = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function wall(x, y, w, h) {
  return rect(x, y, w, h, WALL);
}

// hinge at (hx, hy); leaf opens down/up gap px; swing arc
function doorH(hx, hy, swingDown = true) {
  const gap = 90;
  let s = "";
  s += rect(hx, hy - 8, 16, 16, WALL);
  s += `<path d="M ${hx + 16} ${hy} L ${hx + 16} ${hy + (swingDown ? gap - 16 : -(gap - 16))}" stroke="${WALL}" stroke-width="9" fill="none"/>`;
  s += `<path d="M ${hx + 16} ${hy} A ${gap} ${gap} 0 0 ${swingDown ? 1 : 0} ${hx + 16 + gap} ${hy}" stroke="${WALL_LIGHT}" stroke-width="2" fill="none" stroke-dasharray="4 4"/>`;
  return s;
}

function doorV(hy, hx, swingRight = true) {
  const gap = 90;
  let s = "";
  s += rect(hx - 8, hy, 16, 16, WALL);
  s += `<path d="M ${hx} ${hy + 16} L ${hx + (swingRight ? gap - 16 : -(gap - 16))} ${hy + 16}" stroke="${WALL}" stroke-width="9" fill="none"/>`;
  s += `<path d="M ${hx} ${hy + 16} A ${gap} ${gap} 0 0 ${swingRight ? 1 : 0} ${hx} ${hy + 16 + gap}" stroke="${WALL_LIGHT}" stroke-width="2" fill="none" stroke-dasharray="4 4"/>`;
  return s;
}

function windowH(y, wx, wx2) {
  return (
    `<rect x="${wx}" y="${y - 6}" width="${wx2 - wx}" height="12" fill="#cfe3f7" stroke="${WALL}" stroke-width="10"/>` +
    `<line x1="${wx + 12}" y1="${y}" x2="${wx2 - 12}" y2="${y}" stroke="#ffffff" stroke-width="2"/>` +
    `<line x1="${wx + 12}" y1="${y - 3}" x2="${wx2 - 12}" y2="${y - 3}" stroke="#7c96b8" stroke-width="1"/>`
  );
}

function windowV(x, wy, wy2) {
  return (
    `<rect x="${x - 6}" y="${wy}" width="12" height="${wy2 - wy}" fill="#cfe3f7" stroke="${WALL}" stroke-width="10"/>` +
    `<line x1="${x}" y1="${wy + 12}" x2="${x}" y2="${wy2 - 12}" stroke="#ffffff" stroke-width="2"/>` +
    `<line x1="${x - 3}" y1="${wy + 12}" x2="${x - 3}" y2="${wy2 - 12}" stroke="#7c96b8" stroke-width="1"/>`
  );
}

function label(x, y, text, size = 26) {
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" fill="${TEXT}" letter-spacing="6" text-anchor="middle">${text}</text>`;
}

function bed(x, y, w, h) {
  let s = rect(x, y, w, h, "#ececea", FURN, 3);
  s += rect(x + 16, y + h / 2 - 28, w - 32, 56, "none", FURN, 2);
  for (let i = 1; i <= 3; i++) s += `<line x1="${x + 16}" y1="${y + h / 2 - 28 + i * 14}" x2="${x + w - 16}" y2="${y + h / 2 - 28 + i * 14}" stroke="${FURN}" stroke-width="1.5"/>`;
  return s;
}

function sofa(x, y, w, h) {
  return (
    rect(x, y, w, h, "#ececea", FURN, 3) +
    rect(x + 14, y + 14, w - 28, h - 28, "none", FURN, 2) +
    rect(x + 14, y + 8, w - 28, 10, "none", FURN, 2)
  );
}

function roundTable(x, y, r) {
  return rect(x - r, y - r, r * 2, r * 2, "#f1efe9", FURN, 3);
}

function counter(x, y, w, h) {
  let s = rect(x, y, w, h, "#ececea", FURN, 3);
  s += rect(x + y_off(x, 16), y + 14, 48, 32, "none", FURN, 2);
  s += `<circle cx="${x + w - 30}" cy="${y + h / 2}" r="11" fill="none" stroke="${FURN}" stroke-width="2"/>`;
  return s;
}
function y_off(x, v) {
  return v;
}

function toilet(x, y, facing = "up") {
  // bowl on top, tank below
  return (
    rect(x + 6, y + 26, 34, 22, "#ececea", FURN, 2) +
    `<ellipse cx="${x + 23}" cy="${y + 66}" rx="23" ry="30" fill="none" stroke="${FURN}" stroke-width="2.5"/>`
  );
}

function shower(x, y, s) {
  return (
    rect(x, y, s, s, "none", FURN, 2.5) +
    `<line x1="${x}" y1="${y}" x2="${x + s}" y2="${y + s}" stroke="${FURN}" stroke-width="1.5"/>` +
    `<line x1="${x + s}" y1="${y}" x2="${x}" y2="${y + s}" stroke="${FURN}" stroke-width="1.5"/>`
  );
}

function basin(x, y) {
  return `<ellipse cx="${x}" cy="${y}" rx="26" ry="18" fill="none" stroke="${FURN}" stroke-width="2.5"/>`;
}

// ---- PLAN 1: Studio -------------------------------------------------------
const studioSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1300 1080">
<rect width="1300" height="1080" fill="${BG}"/>
${wall(40, 40, 1220, 24)}
${wall(40, 1040, 1220, 24)}
${wall(40, 40, 24, 1000)}
${wall(1240, 40, 24, 1000)}
${windowV(44, 140, 560)}
${windowH(44, 700, 1120)}
${doorH(560, 40, false)}
${wall(880, 40, 24, 360)}
${wall(880, 340, 360, 24)}
${wall(1220, 340, 24, 340)}
${doorV(180, 880, false)}
${wall(880, 680, 360, 24)}
${windowV(1244, 460, 1060)}
${wall(40, 660, 400, 24)}
${doorH(120, 660, true)}
${counter(140, 120, 320, 60)}
${basin(300, 520)}
${toilet(880 + 40, 380 + 10)}
${shower(1080, 560, 120)}
${sofa(60, 120, 420, 160)}
${roundTable(620, 320, 95)}
${bed(240, 760, 380, 260)}
${label(620, 240, "LIVING")}
${label(620, 430, "KITCHEN")}
${label(1080, 200, "BATH")}
${label(620, 780, "SLEEPING")}
<text x="60" y="1020" font-family="Arial" font-size="20" fill="#c8ccd3">STUDIO · 420 SQ FT · SCALE 1:50</text>
</svg>`;

// ---- PLAN 2: 1BR ----------------------------------------------------------
const onebrSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1560 1120">
<rect width="1560" height="1120" fill="${BG}"/>
${wall(40, 40, 1480, 24)}
${wall(40, 1080, 1480, 24)}
${wall(40, 40, 24, 1040)}
${wall(1520, 40, 24, 1040)}
${windowV(44, 160, 680)}
${windowH(44, 880, 1460)}
${wall(780, 40, 24, 520)}
${wall(780, 520, 380, 24)}
${wall(1160, 520, 24, 340)}
${windowV(1164, 560, 1060)}
${doorH(840, 520, true)}
${wall(780, 860, 380, 24)}
${doorH(820, 860, false)}
${wall(40, 700, 320, 24)}
${doorH(100, 700, true)}
${doorV(560, 780, false)}
${wall(1180, 40, 24, 300)}
${wall(1180, 300, 340, 24)}
${wall(1520, 300, 24, 260)}
${doorV(120, 1180, true)}
${windowV(1524, 400, 860)}
${windowH(1084, 1360, 1500)}
${counter(140, 140, 340, 60)}
${basin(320, 560)}
${sofa(60, 160, 420, 170)}
${roundTable(420, 470, 100)}
${bed(820, 900, 480, 160)}
${sofa(940, 200, 380, 180)}
${toilet(1230, 360)}
${shower(1230, 480, 130)}
${label(820, 250, "LIVING / DINING")}
${label(820, 380, "KITCHEN")}
${label(1360, 150, "BATH")}
${label(820, 540, "BEDROOM")}
${label(1280, 1180 - 40, "BALCONY") }
${label(1420, 720, "BALCONY")}
<text x="60" y="1060" font-family="Arial" font-size="20" fill="#c8ccd3">1 BEDROOM · 780 SQ FT · SCALE 1:100</text>
</svg>`;

// ---- PLAN 3: 2BR ----------------------------------------------------------
const twobrSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1700 1200">
<rect width="1700" height="1200" fill="${BG}"/>
${wall(40, 40, 1620, 24)}
${wall(40, 1160, 1620, 24)}
${wall(40, 40, 24, 1120)}
${wall(1660, 40, 24, 1120)}
${windowV(44, 180, 760)}
${windowH(44, 920, 1600)}
${wall(760, 40, 24, 720)}
${wall(760, 760, 320, 24)}
${wall(1040, 760, 24, 380)}
${doorH(800, 760, true)}
${wall(1040, 40, 24, 480)}
${wall(1040, 500, 300, 24)}
${wall(1340, 500, 24, 320)}
${doorV(140, 1040, true)}
${wall(1360, 40, 24, 800)}
${wall(1360, 840, 300, 24)}
${doorH(1420, 840, false)}
${doorV(600, 760, false)}
${doorV(360, 1340, true)}
${counter(120, 120, 440, 60)}
${sofa(80, 180, 420, 180)}
${roundTable(440, 580, 110)}
${bed(800, 540, 460, 200)}
${toilet(1420, 100)}
${shower(1420, 220, 140)}
${basin(1420, 460)}
${bed(1380, 900, 240, 220)}
${windowV(1664, 920, 1140)}
${windowH(1164, 1540, 1636)}
${label(800, 220, "LIVING")}
${label(800, 360, "KITCHEN")}
${label(1180, 140, "MASTER BEDROOM")}
${label(1560, 400, "BATH")}
${label(1500, 900, "BEDROOM 2")}
<text x="60" y="1140" font-family="Arial" font-size="20" fill="#c8ccd3">2 BEDROOM · 1,250 SQ FT · SCALE 1:100</text>
</svg>`;

const plans = [
  { name: "example-studio", svg: studioSvg, w: 1300, h: 1080 },
  { name: "example-1br", svg: onebrSvg, w: 1560, h: 1120 },
  { name: "example-2br", svg: twobrSvg, w: 1700, h: 1200 },
];

(async () => {
  for (const p of plans) {
    fs.writeFileSync(
      `/Users/partha/Developer/Projects/roomify/scripts/${p.name}.svg`,
      p.svg,
    );
    await sharp(Buffer.from(p.svg)).resize(p.w, p.h).png().toFile(`public/${p.name}.png`);
    console.log(`wrote public/${p.name}.png`);
  }
})()