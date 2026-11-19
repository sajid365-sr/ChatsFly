/**
 * Generates a custom EPS payment methods banner as a PNG.
 * - Left side: "Pay With" label
 * - Center: Payment method logos (bKash, Nagad, Rocket, Visa, MC, Amex, InternetBanking icons via SVG text/symbols)
 * - Right side: "Powered by EPS" badge (green)
 * Output: public/images/eps-verified-banner.png  (1200×180)
 */

const sharp = require("sharp");

// EPS brand colors
const EPS_GREEN = "#00A651";
const EPS_DARK = "#1a1a2e";

// Payment methods data
const methods = [
  { label: "bKash", color: "#E2136E", textColor: "#fff", emoji: "bK" },
  { label: "Nagad", color: "#F36F21", textColor: "#fff", emoji: "Ng" },
  { label: "Rocket", color: "#8B1874", textColor: "#fff", emoji: "Rk" },
  { label: "Upay", color: "#00A651", textColor: "#fff", emoji: "Up" },
  { label: "VISA", color: "#1A1F71", textColor: "#fff", emoji: "VISA" },
  { label: "MC", color: "#EB001B", textColor: "#fff", emoji: "MC" },
  { label: "Amex", color: "#016FD0", textColor: "#fff", emoji: "AX" },
  { label: "Net", color: "#374151", textColor: "#fff", emoji: "🏦" },
];

const W = 1200,
  H = 180;
const PILL_W = 92,
  PILL_H = 60,
  PILL_R = 10;
const PILL_Y = (H - PILL_H) / 2; // 60
const START_X = 160; // after "Pay with"
const GAP = 10;

function escapeSvg(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function methodPill(x, item) {
  return `
  <g transform="translate(${x}, ${PILL_Y})">
    <rect rx="${PILL_R}" ry="${PILL_R}" width="${PILL_W}" height="${PILL_H}"
          fill="${item.color}" />
    <text x="${PILL_W / 2}" y="${PILL_H * 0.65}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="17" font-weight="bold"
          fill="${item.textColor}">${escapeSvg(item.emoji)}</text>
    <text x="${PILL_W / 2}" y="${PILL_H * 0.88}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="10" font-weight="600"
          fill="${item.textColor}80">${escapeSvg(item.label)}</text>
  </g>`;
}

// Build pills
let pillsSvg = "";
let cx = START_X;
for (const item of methods) {
  pillsSvg += methodPill(cx, item);
  cx += PILL_W + GAP;
}

// "More..." dot indicator
pillsSvg += `
  <circle cx="${cx + 12}" cy="${H / 2 - 6}" r="4" fill="#94a3b8"/>
  <circle cx="${cx + 24}" cy="${H / 2 - 6}" r="4" fill="#94a3b8"/>
  <circle cx="${cx + 36}" cy="${H / 2 - 6}" r="4" fill="#94a3b8"/>
`;

// Badge on the right
const BADGE_X = W - 190,
  BADGE_Y = 30,
  BADGE_W = 170,
  BADGE_H = H - 60;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" rx="12" fill="#ffffff"/>
  <rect width="${W}" height="${H}" rx="12" fill="url(#bggrad)" opacity="0.04"/>
  <defs>
    <linearGradient id="bggrad" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${EPS_GREEN}"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="badgegrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${EPS_GREEN}"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>
  </defs>

  <!-- Subtle border -->
  <rect width="${W}" height="${H}" rx="12" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>

  <!-- "Pay With" label -->
  <text x="20" y="${H / 2 - 6}"
        text-anchor="start" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="13" font-weight="700"
        fill="#6b7280" letter-spacing="0.5">PAY</text>
  <text x="20" y="${H / 2 + 10}"
        text-anchor="start" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="13" font-weight="700"
        fill="#6b7280" letter-spacing="0.5">WITH</text>

  <!-- Divider -->
  <line x1="130" y1="${H * 0.2}" x2="130" y2="${H * 0.8}"
        stroke="#e5e7eb" stroke-width="1.5"/>

  <!-- Payment method pills -->
  ${pillsSvg}

  <!-- EPS Badge -->
  <rect x="${BADGE_X}" y="${BADGE_Y}" width="${BADGE_W}" height="${BADGE_H}"
        rx="10" fill="url(#badgegrad)"/>
  <text x="${BADGE_X + BADGE_W / 2}" y="${BADGE_Y + BADGE_H * 0.33}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="10" font-weight="600"
        fill="rgba(255,255,255,0.8)" letter-spacing="1">POWERED BY</text>
  <text x="${BADGE_X + BADGE_W / 2}" y="${BADGE_Y + BADGE_H * 0.62}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="22" font-weight="900"
        fill="#ffffff" letter-spacing="2">EPS</text>
  <text x="${BADGE_X + BADGE_W / 2}" y="${BADGE_Y + BADGE_H * 0.85}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="8.5" font-weight="400"
        fill="rgba(255,255,255,0.75)" letter-spacing="0.5">EASY PAYMENT SYSTEM</text>
</svg>`;

sharp(Buffer.from(svg))
  .resize(1200, 180)
  .png()
  .toFile("public/images/eps-verified-banner.png")
  .then(() => console.log("✅ Created: public/images/eps-verified-banner.png"))
  .catch((e) => console.error("Error:", e.message));
