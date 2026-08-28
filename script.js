/* ============================================================
   AgriConnect — SIH26132 Prototype
   All data below is SIMULATED for demo purposes only.
   ============================================================ */

// ---------- Seeded PRNG so each crop gives consistent demo numbers ----------
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h || 1;
}

// ---------- Base demo prices per crop (₹/quintal) ----------
const CROP_BASE_PRICE = {
  Tomato: 1450,
  Onion: 1800,
  Wheat: 2280,
  Potato: 1150,
  Soybean: 4300,
};

const MARKET_NAMES = [
  { name: "Lasalgaon Mandi", distance: "18 km" },
  { name: "Pimpalgaon APMC", distance: "27 km" },
  { name: "Nashik Central Market", distance: "9 km" },
  { name: "Sinnar Wholesale Yard", distance: "34 km" },
];

const DEMAND_LEVELS = ["High", "Medium", "Low"];

const BUYER_POOL = [
  { name: "AgroFresh Retail Chain", type: "Retail Institution" },
  { name: "Sahyadri FPO Aggregator", type: "FPO / Cooperative" },
  { name: "Nashik Cold Storage Co.", type: "Storage & Trading" },
  { name: "GreenBasket Exports", type: "Export House" },
  { name: "City Wholesale Mart", type: "Wholesale Buyer" },
  { name: "Krishi Bazaar Institutional", type: "Govt. Procurement" },
];

let state = {
  crop: "Wheat",
  quantity: 50,
  quality: "A",
  harvestDate: "2026-08-20",
  location: "Nashik, Maharashtra",
};

// ---------- Utility: currency formatting ----------
const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

// ============================================================
// 1. PRICE CHART (SVG sparkline, simulated 14-day series)
// ============================================================
function renderPriceChart(crop) {
  const rand = seededRandom(seedFromString(crop + "-chart"));
  const base = CROP_BASE_PRICE[crop] || 2000;
  const days = 14;
  const prices = [];
  let price = base * 0.92;
  for (let i = 0; i < days; i++) {
    price += (rand() - 0.42) * base * 0.035;
    prices.push(Math.max(price, base * 0.6));
  }

  const svg = document.getElementById("priceChart");
  const w = 560, h = 240, padL = 46, padR = 14, padT = 16, padB = 28;
  const min = Math.min(...prices) * 0.98;
  const max = Math.max(...prices) * 1.02;

  const x = (i) => padL + (i / (days - 1)) * (w - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);

  let gridLines = "";
  for (let g = 0; g <= 3; g++) {
    const gy = padT + (g / 3) * (h - padT - padB);
    const val = max - (g / 3) * (max - min);
    gridLines += `<line x1="${padL}" y1="${gy}" x2="${w - padR}" y2="${gy}" stroke="#e4e9ef" stroke-width="1"/>`;
    gridLines += `<text x="4" y="${gy + 4}" font-size="10" fill="#67788c">${Math.round(val)}</text>`;
  }

  let path = "";
  let areaPath = "";
  prices.forEach((p, i) => {
    const cmd = i === 0 ? "M" : "L";
    path += `${cmd}${x(i).toFixed(1)},${y(p).toFixed(1)} `;
  });
  areaPath = path + `L${x(days - 1).toFixed(1)},${h - padB} L${x(0).toFixed(1)},${h - padB} Z`;

  let dots = "";
  prices.forEach((p, i) => {
    dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(p).toFixed(1)}" r="3" fill="#177a4f" />`;
  });

  let xLabels = "";
  [0, 6, 13].forEach((i) => {
    xLabels += `<text x="${x(i).toFixed(1)}" y="${h - 8}" font-size="10" fill="#67788c" text-anchor="middle">Day ${i + 1}</text>`;
  });

  svg.innerHTML = `
    ${gridLines}
    <path d="${areaPath}" fill="#177a4f" opacity="0.08"></path>
    <path d="${path}" fill="none" stroke="#177a4f" stroke-width="2.5"></path>
    ${dots}
    ${xLabels}
  `;
}

// ============================================================
// 2. MARKET COMPARISON TABLE
// ============================================================
function computeMarkets(crop) {
  const rand = seededRandom(seedFromString(crop + "-markets"));
  const base = CROP_BASE_PRICE[crop] || 2000;
  return MARKET_NAMES.map((m, i) => {
    const price = base * (0.94 + rand() * 0.16);
    const demand = DEMAND_LEVELS[Math.floor(rand() * DEMAND_LEVELS.length)];
    return { ...m, price, demand };
  });
}

function renderMarketTable(markets) {
  const tbody = document.querySelector("#marketTable tbody");
  tbody.innerHTML = markets
    .map(
      (m) => `
    <tr>
      <td>${m.name}</td>
      <td>${m.distance}</td>
      <td><strong>${inr(m.price)}</strong></td>
      <td><span class="tag-demand tag-demand--${m.demand.toLowerCase()}">${m.demand}</span></td>
    </tr>`
    )
    .join("");
  return markets;
}

// ============================================================
// 3. RECOMMENDATION ENGINE (simple simulated scoring model)
// ============================================================
function computeRecommendation(crop, quantity, quality, markets) {
  const qualityMultiplier = { A: 1.08, B: 1.0, C: 0.9 }[quality] || 1.0;
  const distanceKm = { "18 km": 18, "27 km": 27, "9 km": 9, "34 km": 34 };
  const demandScore = { High: 1.0, Medium: 0.75, Low: 0.5 };

  let best = null;
  const scored = markets.map((m) => {
    const km = distanceKm[m.distance] || 20;
    const transportCostPerQ = 12 + km * 1.6; // ₹ per quintal, simulated
    const storageCostPerQ = 20; // flat simulated storage cost
    const grossPricePerQ = m.price * qualityMultiplier;
    const netPricePerQ = grossPricePerQ - transportCostPerQ - storageCostPerQ;
    const score = netPricePerQ * (demandScore[m.demand] || 0.6);
    return { ...m, km, transportCostPerQ, storageCostPerQ, grossPricePerQ, netPricePerQ, score };
  });

  scored.forEach((m) => {
    if (!best || m.score > best.score) best = m;
  });

  const grossTotal = best.grossPricePerQ * quantity;
  const transportTotal = best.transportCostPerQ * quantity;
  const storageTotal = best.storageCostPerQ * quantity;
  const netTotal = best.netPricePerQ * quantity;

  const priceSpread = Math.max(...scored.map((s) => s.score)) - Math.min(...scored.map((s) => s.score));
  const confidence = Math.min(95, Math.max(55, Math.round(70 + (priceSpread / best.score) * 40)));

  return {
    market: best,
    bestTime: priceSpread > best.score * 0.15 ? "Within 2–3 days" : "Within 5–7 days",
    grossTotal,
    transportTotal,
    storageTotal,
    netTotal,
    confidence,
  };
}

function renderRecommendation(rec) {
  document.getElementById("recMarket").textContent = rec.market.name;
  document.getElementById("recMarket").nextElementSibling.textContent = `${rec.market.distance} away · ${rec.market.demand} simulated demand`;
  document.getElementById("recTime").textContent = rec.bestTime;
  document.getElementById("recProfit").textContent = inr(rec.netTotal);
  document.getElementById("recConfidence").textContent = rec.confidence + "%";
  document.getElementById("confidenceFill").style.width = rec.confidence + "%";

  const tbody = document.querySelector("#breakdownTable tbody");
  tbody.innerHTML = `
    <tr><td>Gross Sale Value (${state.quantity} quintals @ ${inr(rec.market.grossPricePerQ)})</td><td>${inr(rec.grossTotal)}</td></tr>
    <tr><td>Less: Transport Cost (${rec.market.km} km, simulated)</td><td>&minus; ${inr(rec.transportTotal)}</td></tr>
    <tr><td>Less: Storage Cost (simulated)</td><td>&minus; ${inr(rec.storageTotal)}</td></tr>
    <tr class="total"><td>Expected Net Profit</td><td>${inr(rec.netTotal)}</td></tr>
  `;
}

// ============================================================
// 4. BUYER MATCHING
// ============================================================
function computeBuyers(crop, quantity, quality) {
  const rand = seededRandom(seedFromString(crop + "-buyers"));
  const base = CROP_BASE_PRICE[crop] || 2000;
  return BUYER_POOL.map((b, i) => {
    const offerPrice = base * (0.9 + rand() * 0.22);
    const offerQty = Math.round(quantity * (0.5 + rand() * 0.6));
    const match = Math.round(70 + rand() * 28);
    const terms = rand() > 0.5 ? "Advance 30% · Pickup by buyer" : "Full payment on delivery";
    return {
      id: "buyer-" + i,
      name: b.name,
      type: b.type,
      offerPrice,
      offerQty: Math.min(offerQty, quantity),
      match,
      terms,
      status: "pending",
    };
  }).sort((a, b) => b.match - a.match);
}

let buyers = [];

function renderBuyers() {
  const grid = document.getElementById("buyerGrid");
  grid.innerHTML = buyers
    .map(
      (b) => `
    <div class="buyer-card ${b.status === "rejected" ? "is-rejected" : ""}" data-id="${b.id}">
      <div class="buyer-card__head">
        <div>
          <div class="buyer-card__name">${b.name}</div>
          <div class="buyer-card__type">${b.type}</div>
        </div>
        <span class="buyer-card__match">${b.match}% match</span>
      </div>
      <ul class="buyer-card__terms">
        <li><span>Offer Price</span><strong>${inr(b.offerPrice)}/quintal</strong></li>
        <li><span>Quantity Wanted</span><strong>${b.offerQty} quintals</strong></li>
        <li><span>Terms</span><strong>${b.terms}</strong></li>
      </ul>
      ${
        b.status === "pending"
          ? `<div class="buyer-card__actions">
              <button class="btn btn--primary btn--sm" data-action="accept" data-id="${b.id}">Accept Offer</button>
              <button class="btn btn--reject btn--sm" data-action="reject" data-id="${b.id}">Reject</button>
            </div>`
          : b.status === "accepted"
          ? `<div class="buyer-card__status buyer-card__status--accepted">✔ Offer Accepted</div>`
          : `<div class="buyer-card__status buyer-card__status--rejected">✕ Offer Rejected</div>`
      }
    </div>`
    )
    .join("");
}

function handleBuyerAction(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const buyer = buyers.find((b) => b.id === id);
  if (!buyer) return;

  if (action === "accept") {
    buyer.status = "accepted";
    renderDealConfirmation(buyer);
    document.getElementById("deal").scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    buyer.status = "rejected";
  }
  renderBuyers();
}

// ============================================================
// 5. DEAL CONFIRMATION
// ============================================================
function renderDealConfirmation(buyer) {
  document.getElementById("dealEmpty").hidden = true;
  document.getElementById("dealContent").hidden = false;

  const grid = document.getElementById("dealGrid");
  const total = buyer.offerPrice * buyer.offerQty;
  grid.innerHTML = `
    <div><span class="label">Buyer</span><span class="value">${buyer.name}</span></div>
    <div><span class="label">Crop</span><span class="value">${state.crop} · Grade ${state.quality}</span></div>
    <div><span class="label">Quantity</span><span class="value">${buyer.offerQty} quintals</span></div>
    <div><span class="label">Agreed Price</span><span class="value">${inr(buyer.offerPrice)}/quintal</span></div>
    <div><span class="label">Total Value</span><span class="value">${inr(total)}</span></div>
    <div><span class="label">Terms</span><span class="value">${buyer.terms}</span></div>
    <div><span class="label">Seller Location</span><span class="value">${state.location}</span></div>
    <div><span class="label">Harvest Date</span><span class="value">${formatDate(state.harvestDate)}</span></div>
    <div><span class="label">Date Confirmed</span><span class="value">${formatDate(new Date().toISOString().slice(0, 10))}</span></div>
  `;
  document.getElementById("dealRef").textContent =
    "AGC-DEMO-" + Math.abs(seedFromString(buyer.id + state.crop)).toString().slice(0, 8);
}

// ============================================================
// 6. FORM + STATE SYNC
// ============================================================
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const QUALITY_LABEL = { A: "Grade A (Premium)", B: "Grade B (Standard)", C: "Grade C (Fair)" };

function refreshAll() {
  // Listing summary
  document.getElementById("sumCrop").textContent = state.crop;
  document.getElementById("sumQty").textContent = `${state.quantity} Quintals`;
  document.getElementById("sumQuality").textContent = QUALITY_LABEL[state.quality];
  document.getElementById("sumDate").textContent = formatDate(state.harvestDate);
  document.getElementById("sumLocation").textContent = state.location;
  document.getElementById("miCropName").textContent = state.crop;

  // Market intelligence
  renderPriceChart(state.crop);
  const markets = computeMarkets(state.crop);
  renderMarketTable(markets);

  const rand = seededRandom(seedFromString(state.crop + "-metrics"));
  const base = CROP_BASE_PRICE[state.crop] || 2000;
  const current = base * (0.98 + rand() * 0.1);
  const avg = base * (0.95 + rand() * 0.06);
  document.getElementById("currentPrice").innerHTML = `${inr(current)}<span>/quintal</span>`;
  document.getElementById("avgPrice").innerHTML = `${inr(avg)}<span>/quintal</span>`;
  const vol = ["Low", "Moderate", "High"][Math.floor(rand() * 3)];
  document.getElementById("volIndex").textContent = vol;

  // Recommendation
  const rec = computeRecommendation(state.crop, state.quantity, state.quality, markets);
  renderRecommendation(rec);

  // Buyers
  buyers = computeBuyers(state.crop, state.quantity, state.quality);
  renderBuyers();

  // Reset deal confirmation
  document.getElementById("dealEmpty").hidden = false;
  document.getElementById("dealContent").hidden = true;
}

function initForm() {
  const form = document.getElementById("cropForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    state = {
      crop: document.getElementById("cropName").value || "Wheat",
      quantity: Math.max(1, parseInt(document.getElementById("quantity").value, 10) || 1),
      quality: document.getElementById("quality").value,
      harvestDate: document.getElementById("harvestDate").value,
      location: document.getElementById("location").value || "Not specified",
    };
    refreshAll();
    document.getElementById("market").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("buyerGrid").addEventListener("click", handleBuyerAction);
}

document.addEventListener("DOMContentLoaded", () => {
  initForm();
  refreshAll();
});
