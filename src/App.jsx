import React, { useState, useMemo, useRef, useEffect, createContext, useContext } from "react";
import { Sparkles, TrendingUp, Upload, Copy, Check, IndianRupee, PackageSearch, Flame, AlertTriangle, ChevronRight, Plus, Trash2, Download, Image as ImageIcon, Truck, Wand2, Ruler, Target, LineChart as LineChartIcon, Megaphone, Star, MessageCircle, Send, X, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ---------- Shared data store so Charts + Chat Assistant can see data from other tabs ----------
const StoreContext = createContext(null);
const useStore = () => useContext(StoreContext);

// ---------- Design tokens ----------
// Marigold #E8963F | Maroon #7A2E3A | Ivory #FBF4E8 | Brass #C9A15C | Teal #1F5C52 | Ink #2A2019

const CATEGORY_TEMPLATES = {
  jewellery: {
    label: "Artificial Jewellery",
    adjectives: ["Traditional", "Antique", "Oxidised", "Kundan", "Meenakari", "Temple-Style", "Contemporary", "Party Wear", "Bridal", "Everyday"],
    materials: ["Alloy", "Brass", "Copper Oxidised", "Pearl", "Kundan Stone", "Terracotta"],
    occasions: ["Wedding", "Festive", "Daily Wear", "Office Wear", "Party", "Navratri Special"],
    baseTags: ["jewellery", "earrings", "necklace set", "traditional jewellery", "artificial jewellery", "fashion jewellery", "ethnic wear", "combo set", "gift for her", "bridal jewellery", "oxidised jewellery", "indian jewellery", "jhumka", "trending jewellery"],
    weightGrams: 60,
  },
  homekitchen: {
    label: "Home & Kitchen",
    adjectives: ["Multipurpose", "Space-Saving", "Heavy Duty", "Premium", "Unbreakable", "Airtight", "Non-Stick", "Stainless Steel", "Foldable", "Set of"],
    materials: ["Stainless Steel", "Plastic (BPA Free)", "Silicone", "Glass", "Steel & Plastic"],
    occasions: ["Kitchen Storage", "Daily Use", "Gifting", "Home Organisation", "Festive Use"],
    baseTags: ["kitchen tools", "home organiser", "storage container", "kitchen essential", "home decor", "utility", "gift item", "space saver", "kitchen set", "home needs", "storage box", "trending kitchen items"],
    weightGrams: 350,
  },
};

// SEO-style tag engine: mixes category tags, product-specific terms, and buyer-intent search phrases
function generateTags(name, category, details) {
  const t = CATEGORY_TEMPLATES[category];
  const nameWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const buyerIntent = category === "jewellery"
    ? ["under 299", "for saree", "for wedding", "new design 2026", "combo offer"]
    : ["for kitchen", "best quality", "gift set", "new design", "combo offer"];

  const tagSet = new Set([
    ...nameWords,
    name.toLowerCase(),
    ...t.baseTags,
    details.color ? `${details.color.toLowerCase()} ${category === "jewellery" ? "jewellery" : "kitchen item"}` : null,
    details.material ? details.material.toLowerCase() : null,
    ...buyerIntent.map((b) => `${nameWords[0] || t.label.toLowerCase()} ${b}`),
  ].filter(Boolean));

  return Array.from(tagSet).slice(0, 13);
}

function genListing(name, category, details, seedOffset = 0) {
  const t = CATEGORY_TEMPLATES[category];
  const adj = t.adjectives[(details.seed + seedOffset) % t.adjectives.length];
  const material = details.material || t.materials[(details.seed + seedOffset) % t.materials.length];
  const occasion = t.occasions[(details.seed + seedOffset) % t.occasions.length];

  const title = `${adj} ${name}${details.color ? " - " + details.color : ""} | ${material} | ${occasion} | ${details.qty ? "Pack of " + details.qty : "Pack of 1"}`.slice(0, 100);

  const dims = details.length && details.breadth
    ? `Size: ${details.length} x ${details.breadth}${details.height ? " x " + details.height : ""} cm (as entered by seller)`
    : null;

  const bullets = [
    `Material: ${material}${details.color ? `, Colour: ${details.color}` : ""}`,
    `Best for: ${occasion}${details.size ? `, Size: ${details.size}` : ""}`,
    dims,
    `${details.qty ? `Set includes ${details.qty} piece(s) — great value combo` : "Sold as single piece, ready to ship"}`,
    category === "jewellery"
      ? "Lightweight and skin-friendly, comfortable for all-day wear"
      : "Sturdy build, easy to clean, safe for everyday kitchen use",
    "Carefully packed to avoid damage during transit",
  ].filter(Boolean);

  const tags = generateTags(name, category, details);

  return { title, description: bullets.map((b) => "- " + b).join("\n"), tags: tags.join(", "), material, occasion };
}

function CopyBtn({ text, small }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${small ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"} ${copied ? "bg-[#1F5C52] border-[#1F5C52] text-[#FBF4E8]" : "bg-transparent border-[#C9A15C]/50 text-[#7A2E3A] hover:bg-[#C9A15C]/10"}`}
    >
      {copied ? <Check size={small ? 12 : 14} /> : <Copy size={small ? 12 : 14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ---------- Photo variant generation (real canvas processing on the user's own photo) ----------
const VARIANT_STYLES = [
  { key: "clean", label: "Clean Crop", desc: "Tightly cropped, centered, subtle shadow" },
  { key: "warm", label: "Warm Backdrop", desc: "Soft warm-toned frame, festive feel" },
  { key: "soft", label: "Soft Studio", desc: "Muted vignette, softened edges" },
];

function applyVariant(img, canvas, style) {
  const ctx = canvas.getContext("2d");
  const size = 600;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  if (style === "clean") {
    ctx.fillStyle = "#F7F1E4";
    ctx.fillRect(0, 0, size, size);
    const scale = Math.min((size * 0.72) / img.width, (size * 0.72) / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    ctx.restore();
  } else if (style === "warm") {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#F3E0B8");
    grad.addColorStop(1, "#D9A86A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(122,46,58,0.35)";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, size - 40, size - 40);
    const scale = Math.min((size * 0.62) / img.width, (size * 0.62) / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.save();
    ctx.shadowColor = "rgba(90,40,20,0.3)";
    ctx.shadowBlur = 30;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    ctx.restore();
  } else if (style === "soft") {
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, "#FFFFFF");
    grad.addColorStop(1, "#E7DCC4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const scale = Math.min((size * 0.7) / img.width, (size * 0.7) / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.filter = "saturate(1.05) contrast(1.02)";
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    ctx.filter = "none";
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const vgrad = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.71);
    vgrad.addColorStop(0, "rgba(255,255,255,1)");
    vgrad.addColorStop(1, "rgba(220,210,190,0.85)");
    ctx.fillStyle = vgrad;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }
}

function PhotoVariantMaker({ onVariantsReady }) {
  const [srcImg, setSrcImg] = useState(null);
  const [variants, setVariants] = useState([]);
  const [chosen, setChosen] = useState(0);
  const canvasRefs = useRef([]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      setSrcImg(img);
      setTimeout(() => {
        const results = VARIANT_STYLES.map((v, i) => {
          const canvas = canvasRefs.current[i];
          if (canvas) applyVariant(img, canvas, v.key);
          return canvas ? canvas.toDataURL("image/jpeg", 0.9) : null;
        });
        setVariants(results);
        setChosen(0);
        onVariantsReady && onVariantsReady(results[0]);
      }, 50);
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#C9A15C]/50 py-6 cursor-pointer hover:bg-[#C9A15C]/5 transition-colors">
        <Upload size={16} className="text-[#7A2E3A]" />
        <span className="text-sm text-[#5A4632]">{srcImg ? "Replace photo" : "Upload your product photo"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </label>

      {srcImg && (
        <div>
          <p className="text-xs font-semibold text-[#7A2E3A] uppercase tracking-wide mb-2">Pick the best variant</p>
          <div className="grid grid-cols-3 gap-2">
            {VARIANT_STYLES.map((v, i) => (
              <button
                key={v.key}
                onClick={() => {
                  setChosen(i);
                  onVariantsReady && onVariantsReady(variants[i]);
                }}
                className={`rounded-lg overflow-hidden border-2 transition-all ${chosen === i ? "border-[#E8963F] ring-2 ring-[#E8963F]/40" : "border-transparent opacity-80 hover:opacity-100"}`}
              >
                {variants[i] && <img src={variants[i]} alt={v.label} className="w-full aspect-square object-cover" />}
                <p className="text-[10px] text-center py-1 bg-white text-[#5A4632] font-medium">{v.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="hidden">
        {VARIANT_STYLES.map((v, i) => (
          <canvas key={v.key} ref={(el) => (canvasRefs.current[i] = el)} />
        ))}
      </div>

      <div className="rounded-lg bg-[#1F5C52]/10 border border-[#1F5C52]/25 p-3 flex gap-2 items-start">
        <Wand2 size={14} className="text-[#1F5C52] mt-0.5 shrink-0" />
        <p className="text-[11px] text-[#1F5C52] leading-relaxed">
          These 3 versions are real styling of your own photo (crop, backdrop, lighting) — not AI-generated scenes.
          Full AI-generated lifestyle photos aren't available in this tool yet — see "What's Next".
        </p>
      </div>
    </div>
  );
}

// ---------- Shipping calculator ----------
const MEESHO_SHIPPING_SLABS = [
  { max: 500, label: "Up to 500g", rate: 45 },
  { max: 1000, label: "500g - 1kg", rate: 62 },
  { max: 2000, label: "1kg - 2kg", rate: 85 },
  { max: 5000, label: "2kg - 5kg", rate: 130 },
];

function estimateShipping(weightGrams) {
  return MEESHO_SHIPPING_SLABS.find((s) => weightGrams <= s.max) || MEESHO_SHIPPING_SLABS[MEESHO_SHIPPING_SLABS.length - 1];
}

// ---------- Multi-product bulk builder ----------
let productIdSeed = 1;
function emptyProduct(category = "jewellery") {
  return {
    id: productIdSeed++,
    name: "",
    category,
    color: "",
    material: "",
    qty: "",
    size: "",
    length: "",
    breadth: "",
    height: "",
    cost: 100,
    weight: CATEGORY_TEMPLATES[category].weightGrams,
    competitorPrice: 299,
    marginPct: 20,
    photo: null,
    seed: Math.floor(Math.random() * 1000),
  };
}

function BulkBuilder() {
  const [products, setProducts] = useState([emptyProduct("jewellery")]);
  const [generated, setGenerated] = useState(false);
  const [commissionPct] = useState(12);

  const update = (id, patch) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addProduct = () => setProducts((ps) => [...ps, emptyProduct("jewellery")]);
  const removeProduct = (id) => setProducts((ps) => ps.filter((p) => p.id !== id));

  const results = useMemo(() => {
    return products
      .filter((p) => p.name.trim())
      .map((p) => {
        const listing = genListing(p.name, p.category, p);
        const shipSlab = estimateShipping(Number(p.weight) || 100);
        const denom = 1 - commissionPct / 100 - Number(p.marginPct) / 100;
        const suggestedPrice = denom > 0 ? (Number(p.cost) + shipSlab.rate) / denom : 0;
        const vsCompetitor = suggestedPrice - Number(p.competitorPrice);
        return { ...p, ...listing, shipSlab, suggestedPrice, vsCompetitor };
      });
  }, [products, commissionPct]);

  const generateAll = () => setGenerated(true);

  const downloadExcel = () => {
    const headers = ["Product Name", "Category", "Title", "Description", "Tags (SEO)", "Colour", "Material", "Dimensions (L x B x H cm)", "Suggested Price (Rs)", "Cost (Rs)", "Est. Shipping (Rs)", "Weight Slab", "Competitor Price (Rs)", "Price vs Competitor"];
    const rows = results.map((r) => [
      r.name, CATEGORY_TEMPLATES[r.category].label, r.title, r.description.replace(/\n/g, " | "), r.tags,
      r.color || "-", r.material, (r.length && r.breadth) ? `${r.length} x ${r.breadth}${r.height ? " x " + r.height : ""}` : "-",
      r.suggestedPrice.toFixed(0), r.cost, r.shipSlab.rate, r.shipSlab.label,
      r.competitorPrice, r.vsCompetitor > 0 ? `+Rs${r.vsCompetitor.toFixed(0)} higher` : `Rs${Math.abs(r.vsCompetitor).toFixed(0)} lower`,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meesho-bulk-catalogue.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#7A2E3A] text-[#FBF4E8] p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold">Add all your products, then generate everything in one click</p>
          <p className="text-xs opacity-80 mt-0.5">Titles, SEO tags, description, price, dimensions and shipping — one row per product.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAll} className="inline-flex items-center gap-2 rounded-xl bg-[#E8963F] text-[#2A2019] font-semibold px-4 py-2 text-sm hover:bg-[#d6832b]">
            <Sparkles size={15} /> Generate all
          </button>
          {generated && (
            <button onClick={downloadExcel} className="inline-flex items-center gap-2 rounded-xl bg-[#1F5C52] text-[#FBF4E8] font-semibold px-4 py-2 text-sm hover:bg-[#184940]">
              <Download size={15} /> Download sheet
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {products.map((p, idx) => (
          <div key={p.id} className="rounded-2xl bg-white/70 border border-[#C9A15C]/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#7A2E3A]">Product {idx + 1}</p>
              {products.length > 1 && (
                <button onClick={() => removeProduct(p.id)} className="text-[#7A2E3A]/60 hover:text-[#7A2E3A]">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-[1.3fr_1fr] gap-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  {Object.entries(CATEGORY_TEMPLATES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => update(p.id, { category: key, weight: t.weightGrams })}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${p.category === key ? "bg-[#7A2E3A] text-[#FBF4E8] border-[#7A2E3A]" : "bg-transparent border-[#C9A15C]/40 text-[#5A4632]"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <input placeholder="Product name e.g. Oxidised Jhumka Earrings" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8963F]" />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Colour" value={p.color} onChange={(e) => update(p.id, { color: e.target.value })} className="rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-3 py-2 text-xs" />
                  <input placeholder="Pack qty" value={p.qty} onChange={(e) => update(p.id, { qty: e.target.value })} className="rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-3 py-2 text-xs" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ruler size={11} className="text-[#7A2E3A]" />
                    <label className="text-[10px] font-semibold text-[#7A2E3A] uppercase tracking-wide">Actual size (you measure — can't be auto-detected from photo)</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input placeholder="Length cm" value={p.length} onChange={(e) => update(p.id, { length: e.target.value })} className="rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                    <input placeholder="Breadth cm" value={p.breadth} onChange={(e) => update(p.id, { breadth: e.target.value })} className="rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                    <input placeholder="Height cm" value={p.height} onChange={(e) => update(p.id, { height: e.target.value })} className="rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[#5A4632]">Cost ₹</label>
                    <input type="number" value={p.cost} onChange={(e) => update(p.id, { cost: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#5A4632]">Weight (g)</label>
                    <input type="number" value={p.weight} onChange={(e) => update(p.id, { weight: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#5A4632]">Margin %</label>
                    <input type="number" value={p.marginPct} onChange={(e) => update(p.id, { marginPct: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#5A4632]">Competitor price ₹</label>
                  <input type="number" value={p.competitorPrice} onChange={(e) => update(p.id, { competitorPrice: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                </div>
              </div>
              <PhotoVariantMaker onVariantsReady={(dataUrl) => update(p.id, { photo: dataUrl })} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={addProduct} className="w-full rounded-xl border-2 border-dashed border-[#C9A15C]/50 py-3 text-sm font-medium text-[#7A2E3A] hover:bg-[#C9A15C]/5 flex items-center justify-center gap-2">
        <Plus size={16} /> Add another product
      </button>

      {generated && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#7A2E3A]">Generated catalogue preview</p>
          {results.map((r, i) => (
            <div key={i} className="rounded-2xl bg-white border border-[#C9A15C]/30 p-4">
              <div className="flex gap-4">
                {r.photo ? (
                  <img src={r.photo} alt={r.name} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-[#F3E6C9] flex items-center justify-center shrink-0">
                    <ImageIcon size={20} className="text-[#C9A15C]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2A2019] truncate">{r.title}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#5A4632]">
                    <span className="flex items-center gap-1 font-semibold text-[#7A2E3A]"><IndianRupee size={11} />{r.suggestedPrice.toFixed(0)}</span>
                    <span className="flex items-center gap-1"><Truck size={11} />₹{r.shipSlab.rate} ({r.shipSlab.label})</span>
                    <span className={r.vsCompetitor > 0 ? "text-[#B5543E]" : "text-[#1F5C52]"}>
                      {r.vsCompetitor > 0 ? `₹${r.vsCompetitor.toFixed(0)} above competitor` : `₹${Math.abs(r.vsCompetitor).toFixed(0)} below competitor`}
                    </span>
                  </div>
                </div>
                <CopyBtn text={`${r.title}\n\n${r.description}\n\nTags: ${r.tags}`} small />
              </div>
              <div className="mt-3 pt-3 border-t border-[#C9A15C]/20 flex flex-wrap gap-1.5">
                {r.tags.split(", ").map((tag, ti) => (
                  <span key={ti} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1F5C52]/10 text-[#1F5C52] font-medium">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Sales Analyzer ----------
function parseCSV(text) {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i]));
    return row;
  });
  return { headers, rows };
}

const DEMO_CSV = `product,units sold,returns,price
Oxidised Jhumka Earrings,142,18,249
Pearl Choker Necklace Set,98,9,399
Kundan Maang Tikka,64,22,199
Stainless Steel Dry Fruit Box,210,6,349
Airtight Kitchen Storage Set (Pack of 4),176,11,449
Non-Stick Dosa Tawa,55,4,299
Meenakari Bangles Set,120,31,179
Foldable Fruit Basket,88,3,229`;

function SalesAnalyzer() {
  const [data, setData] = useState(() => parseCSV(DEMO_CSV));
  const [fileName, setFileName] = useState("demo-data.csv");
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed) setData(parsed);
    };
    reader.readAsText(file);
  };

  const analysis = useMemo(() => {
    if (!data) return null;
    const rows = data.rows
      .map((r) => ({
        product: r.product || r["product name"] || "Unknown",
        units: Number(r["units sold"] || r.units || r.orders || 0),
        returns: Number(r.returns || r["return count"] || 0),
        price: Number(r.price || r["selling price"] || 0),
      }))
      .filter((r) => r.product && r.product !== "Unknown");

    const withRate = rows.map((r) => ({ ...r, returnRate: r.units > 0 ? (r.returns / r.units) * 100 : 0 }));
    const topSelling = [...withRate].sort((a, b) => b.units - a.units).slice(0, 5);
    const highestReturn = [...withRate].sort((a, b) => b.returnRate - a.returnRate).slice(0, 5);
    const totalUnits = rows.reduce((s, r) => s + r.units, 0);
    const totalReturns = rows.reduce((s, r) => s + r.returns, 0);
    const avgReturnRate = totalUnits > 0 ? (totalReturns / totalUnits) * 100 : 0;

    return { withRate, topSelling, highestReturn, totalUnits, totalReturns, avgReturnRate };
  }, [data]);

  const store = useStore();
  useEffect(() => {
    store?.setSalesData(analysis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white/70 border border-[#C9A15C]/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#7A2E3A]">Upload your Meesho order/sales export</p>
            <p className="text-xs text-[#5A4632]/70 mt-0.5">CSV with columns like: product, units sold, returns, price. Download this from Supplier Panel → Orders/Reports.</p>
          </div>
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-[#1F5C52] text-[#FBF4E8] px-4 py-2 text-sm font-medium hover:bg-[#184940]">
            <Upload size={15} /> Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </div>
        <p className="text-[11px] text-[#5A4632]/60 mt-2">Currently showing: <b>{fileName}</b>{fileName === "demo-data.csv" && " (sample data — upload yours to replace it)"}</p>
      </div>

      {analysis && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border border-[#C9A15C]/30 p-4 text-center">
              <p className="text-2xl font-bold text-[#2A2019]">{analysis.totalUnits}</p>
              <p className="text-xs text-[#5A4632]/70 mt-0.5">Total units sold</p>
            </div>
            <div className="rounded-xl bg-white border border-[#C9A15C]/30 p-4 text-center">
              <p className="text-2xl font-bold text-[#2A2019]">{analysis.totalReturns}</p>
              <p className="text-xs text-[#5A4632]/70 mt-0.5">Total returns</p>
            </div>
            <div className="rounded-xl bg-white border border-[#C9A15C]/30 p-4 text-center">
              <p className="text-2xl font-bold text-[#7A2E3A]">{analysis.avgReturnRate.toFixed(1)}%</p>
              <p className="text-xs text-[#5A4632]/70 mt-0.5">Avg return rate</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-[#C9A15C]/30 p-4">
              <p className="text-sm font-semibold text-[#1F5C52] flex items-center gap-1.5 mb-3"><Flame size={15} /> Top selling products</p>
              <div className="space-y-2">
                {analysis.topSelling.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#2A2019] truncate pr-2">{i + 1}. {r.product}</span>
                    <span className="text-[#1F5C52] font-semibold whitespace-nowrap">{r.units} sold</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-[#C9A15C]/30 p-4">
              <p className="text-sm font-semibold text-[#7A2E3A] flex items-center gap-1.5 mb-3"><AlertTriangle size={15} /> Highest return rate</p>
              <div className="space-y-2">
                {analysis.highestReturn.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#2A2019] truncate pr-2">{i + 1}. {r.product}</span>
                    <span className="text-[#7A2E3A] font-semibold whitespace-nowrap">{r.returnRate.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#E8963F]/10 border border-[#E8963F]/30 p-4">
            <p className="text-sm font-semibold text-[#7A2E3A] mb-2">Suggestions based on this data</p>
            <ul className="text-sm text-[#5A4632] space-y-1.5 list-disc list-inside">
              <li>Restock and push ads on <b>{analysis.topSelling[0]?.product}</b> — it's your clear bestseller.</li>
              <li><b>{analysis.highestReturn[0]?.product}</b> has a {analysis.highestReturn[0]?.returnRate.toFixed(0)}% return rate — check the product photos match reality, verify sizing info, and read recent return reasons in your panel.</li>
              <li>Products with return rate above 15% usually hurt your account's overall rating — consider pausing or fixing listings above that line.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Trending ----------
const TRENDING = {
  jewellery: [
    { name: "Oxidised Layered Necklace Sets", why: "Strong festive + Navratri demand, low return rate when sizing is accurate" },
    { name: "Pearl Kundan Combo Sets", why: "Wedding season pickup, higher AOV via combo packaging" },
    { name: "Minimalist Gold-Plated Studs", why: "High repeat-purchase, appeals to daily office wear segment" },
  ],
  homekitchen: [
    { name: "Airtight Modular Storage Sets", why: "Consistently high search volume, low returns, good for combo upsell" },
    { name: "Foldable/Space-saving Organisers", why: "Rising demand from small-home buyers in tier 2/3 cities" },
    { name: "Stainless Steel Lunch/Dry Fruit Boxes", why: "Gifting season spikes, durable = fewer returns" },
  ],
};

function Trending() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#1F5C52] text-[#FBF4E8] p-5">
        <p className="text-sm font-semibold flex items-center gap-2"><TrendingUp size={16} /> Trending direction, not live data</p>
        <p className="text-xs opacity-85 mt-1 leading-relaxed">
          This list reflects general category patterns for Indian resellers, not a live feed. Ask me in chat anytime to search for what's trending right now — I'll pull current results and can add them here.
        </p>
      </div>
      {Object.entries(TRENDING).map(([key, items]) => (
        <div key={key} className="rounded-2xl bg-white border border-[#C9A15C]/30 p-5">
          <p className="text-sm font-semibold text-[#7A2E3A] mb-3">{CATEGORY_TEMPLATES[key].label}</p>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-lg font-bold text-[#E8963F]/60 leading-none">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-[#2A2019]">{it.name}</p>
                  <p className="text-xs text-[#5A4632]/70 mt-0.5">{it.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Product/Niche Picker ----------
function NichePicker() {
  const [ideas, setIdeas] = useState([
    { id: 1, name: "Oxidised Jhumka Earrings", competition: "medium", price: 249, cost: 90, uniqueness: "medium" },
  ]);

  const addIdea = () => setIdeas((s) => [...s, { id: Date.now(), name: "", competition: "medium", price: 0, cost: 0, uniqueness: "medium" }]);
  const update = (id, patch) => setIdeas((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id) => setIdeas((s) => s.filter((i) => i.id !== id));

  const scored = useMemo(() => {
    return ideas
      .filter((i) => i.name.trim())
      .map((i) => {
        const margin = i.price > 0 ? ((i.price - i.cost) / i.price) * 100 : 0;
        const compScore = { low: 30, medium: 18, high: 6 }[i.competition];
        const uniqScore = { low: 5, medium: 15, high: 25 }[i.uniqueness];
        const marginScore = Math.min(30, margin * 0.6);
        const total = Math.round(compScore + uniqScore + marginScore);
        let verdict = "Worth testing";
        if (total >= 55) verdict = "Strong pick";
        else if (total < 35) verdict = "Risky — thin margin or too crowded";
        return { ...i, margin, total, verdict };
      })
      .sort((a, b) => b.total - a.total);
  }, [ideas]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#1F5C52] text-[#FBF4E8] p-4">
        <p className="text-sm font-semibold flex items-center gap-2"><Target size={16} /> Score your product ideas before listing</p>
        <p className="text-xs opacity-85 mt-1 leading-relaxed">This is a decision framework based on what you enter — not live Meesho search-volume data (no public API exists for that). Rate competition and uniqueness honestly for a useful score.</p>
      </div>

      <div className="space-y-3">
        {ideas.map((idea) => (
          <div key={idea.id} className="rounded-2xl bg-white/70 border border-[#C9A15C]/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <input placeholder="Product idea name" value={idea.name} onChange={(e) => update(idea.id, { name: e.target.value })} className="flex-1 rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-3 py-2 text-sm mr-2" />
              <button onClick={() => remove(idea.id)} className="text-[#7A2E3A]/60 hover:text-[#7A2E3A]"><Trash2 size={15} /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              <div>
                <label className="text-[10px] text-[#5A4632]">Selling price ₹</label>
                <input type="number" value={idea.price} onChange={(e) => update(idea.id, { price: Number(e.target.value) })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-[#5A4632]">Cost price ₹</label>
                <input type="number" value={idea.cost} onChange={(e) => update(idea.id, { cost: Number(e.target.value) })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-[#5A4632]">Competition level</label>
                <select value={idea.competition} onChange={(e) => update(idea.id, { competition: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs">
                  <option value="low">Low (few sellers)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (saturated)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#5A4632]">How unique is it</label>
                <select value={idea.uniqueness} onChange={(e) => update(idea.id, { uniqueness: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs">
                  <option value="low">Common design</option>
                  <option value="medium">Somewhat different</option>
                  <option value="high">Hard to find elsewhere</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addIdea} className="w-full rounded-xl border-2 border-dashed border-[#C9A15C]/50 py-3 text-sm font-medium text-[#7A2E3A] hover:bg-[#C9A15C]/5 flex items-center justify-center gap-2">
        <Plus size={16} /> Add another idea
      </button>

      {scored.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#7A2E3A]">Ranked results</p>
          {scored.map((s, i) => (
            <div key={s.id} className="rounded-xl bg-white border border-[#C9A15C]/30 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#2A2019]">{i + 1}. {s.name}</p>
                <p className="text-xs text-[#5A4632]/70 mt-0.5">{s.margin.toFixed(0)}% margin · {s.competition} competition · {s.uniqueness} uniqueness</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-[#7A2E3A]">{s.total}/85</p>
                <p className={`text-[11px] font-medium ${s.total >= 55 ? "text-[#1F5C52]" : s.total < 35 ? "text-[#B5543E]" : "text-[#C9A15C]"}`}>{s.verdict}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Competitor Price Log ----------
function CompetitorTracker() {
  const [logs, setLogs] = useState([
    { id: 1, product: "Oxidised Jhumka Earrings", myPrice: 249, competitor: "Seller A", theirPrice: 279, date: new Date().toISOString().slice(0, 10) },
  ]);

  const addLog = () => setLogs((s) => [...s, { id: Date.now(), product: "", myPrice: 0, competitor: "", theirPrice: 0, date: new Date().toISOString().slice(0, 10) }]);
  const update = (id, patch) => setLogs((s) => s.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id) => setLogs((s) => s.filter((l) => l.id !== id));

  const grouped = useMemo(() => {
    const byProduct = {};
    logs.filter((l) => l.product.trim()).forEach((l) => {
      if (!byProduct[l.product]) byProduct[l.product] = [];
      byProduct[l.product].push(l);
    });
    return byProduct;
  }, [logs]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#1F5C52] text-[#FBF4E8] p-4">
        <p className="text-sm font-semibold flex items-center gap-2"><LineChartIcon size={16} /> Log competitor prices over time</p>
        <p className="text-xs opacity-85 mt-1 leading-relaxed">I can't monitor competitors 24/7 in the background — I only work when you're chatting with me. Log prices here whenever you check, and patterns build up over time. Ask me to fetch a specific competitor listing's current price anytime and I'll add it live.</p>
      </div>

      <div className="space-y-3">
        {logs.map((l) => (
          <div key={l.id} className="rounded-2xl bg-white/70 border border-[#C9A15C]/30 p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] text-[#5A4632]">Product</label>
                <input value={l.product} onChange={(e) => update(l.id, { product: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-[#5A4632]">My price ₹</label>
                <input type="number" value={l.myPrice} onChange={(e) => update(l.id, { myPrice: Number(e.target.value) })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-[#5A4632]">Competitor name</label>
                <input value={l.competitor} onChange={(e) => update(l.id, { competitor: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-[#5A4632]">Their price ₹</label>
                <input type="number" value={l.theirPrice} onChange={(e) => update(l.id, { theirPrice: Number(e.target.value) })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
              </div>
              <div className="flex items-end gap-2">
                <input type="date" value={l.date} onChange={(e) => update(l.id, { date: e.target.value })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                <button onClick={() => remove(l.id)} className="text-[#7A2E3A]/60 hover:text-[#7A2E3A] pb-1.5"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addLog} className="w-full rounded-xl border-2 border-dashed border-[#C9A15C]/50 py-3 text-sm font-medium text-[#7A2E3A] hover:bg-[#C9A15C]/5 flex items-center justify-center gap-2">
        <Plus size={16} /> Log another price check
      </button>

      {Object.entries(grouped).map(([product, entries]) => {
        const latest = entries[entries.length - 1];
        const gap = latest.myPrice - latest.theirPrice;
        return (
          <div key={product} className="rounded-xl bg-white border border-[#C9A15C]/30 p-4">
            <p className="text-sm font-medium text-[#2A2019]">{product}</p>
            <p className={`text-xs mt-1 ${gap > 0 ? "text-[#B5543E]" : "text-[#1F5C52]"}`}>
              {gap > 0 ? `You're ₹${gap} above ${latest.competitor}` : gap < 0 ? `You're ₹${Math.abs(gap)} below ${latest.competitor}` : "Price matched"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Profit Dashboard ----------
function ProfitDashboard() {
  const [rows, setRows] = useState([
    { id: 1, product: "Oxidised Jhumka Earrings", units: 142, returns: 18, price: 249, cost: 90, shipping: 45 },
    { id: 2, product: "Stainless Steel Dry Fruit Box", units: 210, returns: 6, price: 349, cost: 140, shipping: 62 },
  ]);

  const addRow = () => setRows((s) => [...s, { id: Date.now(), product: "", units: 0, returns: 0, price: 0, cost: 0, shipping: 0 }]);
  const update = (id, patch) => setRows((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => setRows((s) => s.filter((r) => r.id !== id));

  const analyzed = useMemo(() => {
    return rows
      .filter((r) => r.product.trim())
      .map((r) => {
        const commission = r.price * 0.12;
        const profitPerUnit = r.price - r.cost - r.shipping - commission;
        const totalProfit = profitPerUnit * (r.units - r.returns);
        const returnRate = r.units > 0 ? (r.returns / r.units) * 100 : 0;
        const healthScore = Math.max(0, Math.min(100, Math.round((r.units / 5) - returnRate * 2 + profitPerUnit / 2)));
        return { ...r, profitPerUnit, totalProfit, returnRate, healthScore };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [rows]);

  const totalProfit = analyzed.reduce((s, r) => s + r.totalProfit, 0);

  const store = useStore();
  useEffect(() => {
    store?.setProfitData({ rows: analyzed, totalProfit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#7A2E3A] text-[#FBF4E8] p-5">
        <p className="text-xs uppercase tracking-wide opacity-80">Total estimated profit across products</p>
        <p className="text-3xl font-bold flex items-center gap-1 mt-1"><IndianRupee size={24} />{totalProfit.toFixed(0)}</p>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white/70 border border-[#C9A15C]/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <input placeholder="Product name" value={r.product} onChange={(e) => update(r.id, { product: e.target.value })} className="flex-1 rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-3 py-2 text-sm" />
              <button onClick={() => remove(r.id)} className="text-[#7A2E3A]/60 hover:text-[#7A2E3A]"><Trash2 size={15} /></button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {[["Units sold", "units"], ["Returns", "returns"], ["Price ₹", "price"], ["Cost ₹", "cost"], ["Shipping ₹", "shipping"]].map(([label, key]) => (
                <div key={key}>
                  <label className="text-[10px] text-[#5A4632]">{label}</label>
                  <input type="number" value={r[key]} onChange={(e) => update(r.id, { [key]: Number(e.target.value) })} className="w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-2 py-1.5 text-xs" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="w-full rounded-xl border-2 border-dashed border-[#C9A15C]/50 py-3 text-sm font-medium text-[#7A2E3A] hover:bg-[#C9A15C]/5 flex items-center justify-center gap-2">
        <Plus size={16} /> Add product
      </button>

      {analyzed.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#7A2E3A]">Ranked by total profit</p>
          {analyzed.map((r, i) => (
            <div key={r.id} className="rounded-xl bg-white border border-[#C9A15C]/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#2A2019]">{i + 1}. {r.product}</p>
                <p className="text-sm font-bold text-[#1F5C52]">₹{r.totalProfit.toFixed(0)}</p>
              </div>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-[#5A4632]">
                <span>₹{r.profitPerUnit.toFixed(0)}/unit profit</span>
                <span className={r.returnRate > 15 ? "text-[#B5543E]" : ""}>{r.returnRate.toFixed(0)}% returns</span>
                <span className="flex items-center gap-1"><Star size={11} className={r.healthScore > 50 ? "text-[#E8963F]" : "text-[#C9A15C]/50"} />Health: {r.healthScore}/100</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Ad Budget Planner ----------
function AdPlanner() {
  const [budget, setBudget] = useState(1000);
  const [cpc, setCpc] = useState(3);
  const [convRate, setConvRate] = useState(4);
  const [price, setPrice] = useState(249);
  const [profitPerUnit, setProfitPerUnit] = useState(60);

  const calc = useMemo(() => {
    const clicks = budget / cpc;
    const orders = clicks * (convRate / 100);
    const revenue = orders * price;
    const profit = orders * profitPerUnit;
    const netAfterAd = profit - budget;
    const roas = budget > 0 ? revenue / budget : 0;
    return { clicks, orders, revenue, profit, netAfterAd, roas };
  }, [budget, cpc, convRate, price, profitPerUnit]);

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      <div className="rounded-2xl bg-white/70 border border-[#C9A15C]/30 p-5 space-y-4">
        <p className="text-xs font-semibold text-[#7A2E3A] uppercase tracking-wide">Enter your numbers</p>
        {[
          ["Daily ad budget (₹)", budget, setBudget],
          ["Estimated cost per click (₹)", cpc, setCpc],
          ["Conversion rate (%) — clicks that become orders", convRate, setConvRate],
          ["Selling price (₹)", price, setPrice],
          ["Profit per unit after all costs (₹)", profitPerUnit, setProfitPerUnit],
        ].map(([label, val, setter], i) => (
          <div key={i}>
            <label className="text-xs text-[#5A4632]">{label}</label>
            <input type="number" value={val} onChange={(e) => setter(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#C9A15C]/40 bg-[#FBF4E8] px-3 py-2 text-sm" />
          </div>
        ))}
        <p className="text-[11px] text-[#5A4632]/70 leading-relaxed pt-1">CPC and conversion rate vary by product/category — check your actual Meesho Ads dashboard for real numbers once you've run a few days of ads, then plug them in here for accurate planning.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-[#7A2E3A] text-[#FBF4E8] p-6">
          <p className="text-xs uppercase tracking-wide opacity-80 mb-1">Estimated orders/day</p>
          <p className="text-3xl font-bold">{calc.orders.toFixed(1)}</p>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20 text-sm">
            <div><p className="opacity-70 text-xs">Est. clicks/day</p><p className="font-semibold">{calc.clicks.toFixed(0)}</p></div>
            <div><p className="opacity-70 text-xs">ROAS</p><p className="font-semibold">{calc.roas.toFixed(1)}x</p></div>
          </div>
        </div>
        <div className={`rounded-2xl p-5 border ${calc.netAfterAd >= 0 ? "bg-[#1F5C52]/10 border-[#1F5C52]/40" : "bg-[#B5543E]/10 border-[#B5543E]/40"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-[#5A4632]">Net profit after ad spend</p>
          <p className={`text-xl font-bold ${calc.netAfterAd >= 0 ? "text-[#1F5C52]" : "text-[#B5543E]"}`}>₹{calc.netAfterAd.toFixed(0)}/day</p>
          <p className="text-xs text-[#5A4632] mt-1">{calc.netAfterAd >= 0 ? "This budget is profitable at these numbers." : "This budget is losing money at these numbers — raise conversion rate, lower CPC, or increase margin before scaling ad spend."}</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Charts tab ----------
const CHART_COLORS = ["#7A2E3A", "#E8963F", "#1F5C52", "#C9A15C", "#B5543E"];

function ChartsTab() {
  const store = useStore();
  const sales = store?.salesData;
  const profit = store?.profitData;

  const hasSales = sales && sales.withRate && sales.withRate.length > 0;
  const hasProfit = profit && profit.rows && profit.rows.length > 0;

  if (!hasSales && !hasProfit) {
    return (
      <div className="rounded-2xl bg-white border border-[#C9A15C]/30 p-8 text-center">
        <BarChart3 size={32} className="text-[#C9A15C] mx-auto mb-3" />
        <p className="text-sm font-medium text-[#2A2019]">No data to chart yet</p>
        <p className="text-xs text-[#5A4632]/70 mt-1">Add products in the Profit Dashboard or upload a CSV in Sales Analyzer — charts will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasSales && (
        <div className="rounded-2xl bg-white border border-[#C9A15C]/30 p-5">
          <p className="text-sm font-semibold text-[#7A2E3A] mb-4">Units sold vs returns by product</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sales.withRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C9A15C33" />
              <XAxis dataKey="product" tick={{ fontSize: 10, fill: "#5A4632" }} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: "#5A4632" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="units" name="Units sold" fill="#1F5C52" radius={[4, 4, 0, 0]} />
              <Bar dataKey="returns" name="Returns" fill="#B5543E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasSales && (
        <div className="rounded-2xl bg-white border border-[#C9A15C]/30 p-5">
          <p className="text-sm font-semibold text-[#7A2E3A] mb-4">Return rate by product (%)</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sales.withRate} dataKey="returnRate" nameKey="product" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 10 }}>
                {sales.withRate.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => v.toFixed(1) + "%"} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasProfit && (
        <div className="rounded-2xl bg-white border border-[#C9A15C]/30 p-5">
          <p className="text-sm font-semibold text-[#7A2E3A] mb-4">Profit per product (₹)</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={profit.rows} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#C9A15C33" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#5A4632" }} />
              <YAxis type="category" dataKey="product" tick={{ fontSize: 10, fill: "#5A4632" }} width={140} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="totalProfit" name="Total profit" fill="#E8963F" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------- Chat Assistant (rule-based, reads live data from other tabs) ----------
function answerQuestion(question, store) {
  const q = question.toLowerCase();
  const sales = store?.salesData;
  const profit = store?.profitData;

  if (/top.*sell|best.*sell|bestseller/.test(q)) {
    if (sales?.topSelling?.length) {
      const top = sales.topSelling[0];
      return `Your top seller in the Sales Analyzer is "${top.product}" with ${top.units} units sold. Consider restocking it and increasing ad spend on it.`;
    }
    return `I don't see sales data yet — add your numbers in the Sales Analyzer tab (upload a CSV) and I'll tell you your top seller instantly.`;
  }

  if (/return/.test(q)) {
    if (sales?.highestReturn?.length) {
      const top = sales.highestReturn[0];
      return `"${top.product}" has your highest return rate at ${top.returnRate.toFixed(0)}%. Check if the listing photos and description match what you're actually shipping — mismatched expectations are the most common cause.`;
    }
    return `Add data in Sales Analyzer and I'll flag your highest-return product automatically.`;
  }

  if (/profit|margin|money/.test(q)) {
    if (profit?.rows?.length) {
      const top = profit.rows[0];
      return `Your most profitable product right now is "${top.product}" earning about ₹${top.totalProfit.toFixed(0)} total. Your overall profit across tracked products is ₹${profit.totalProfit.toFixed(0)}.`;
    }
    return `Add your products in the Profit Dashboard tab with cost/price/units and I'll tell you which one makes the most money.`;
  }

  if (/price|pricing/.test(q)) {
    return `Head to the Bulk Catalogue Builder — enter your cost, weight, and target margin per product, and it calculates a suggested selling price automatically, compared against your competitor's price.`;
  }

  if (/ad|advertis|promot/.test(q)) {
    return `Use the Ad Planner tab — enter your daily budget, CPC, and conversion rate, and it tells you estimated orders and whether that spend is actually profitable before you commit budget.`;
  }

  if (/trend|what.*sell|new product/.test(q)) {
    return `Check the Trending Picks tab for category direction, and use the Niche Picker to score your own product ideas by margin, competition, and uniqueness before you commit to stocking them.`;
  }

  return `I can answer questions about your top sellers, highest returns, profit, pricing, ads, or trending picks — try asking something like "what's my highest return product" or "which product makes the most profit".`;
}

function ChatAssistant() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! Ask me about your top sellers, returns, profit, or pricing — I'll pull answers from your data in this toolkit." },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    const botMsg = { role: "bot", text: answerQuestion(input, store) };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 w-[90vw] max-w-sm h-[60vh] bg-white rounded-2xl border border-[#C9A15C]/40 shadow-2xl flex flex-col z-30 overflow-hidden">
          <div className="bg-[#7A2E3A] text-[#FBF4E8] px-4 py-3 flex items-center justify-between shrink-0">
            <p className="text-sm font-semibold flex items-center gap-2"><MessageCircle size={16} /> Toolkit Assistant</p>
            <button onClick={() => setOpen(false)}><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FBF4E8]">
            {messages.map((m, i) => (
              <div key={i} className={`text-sm rounded-xl px-3 py-2 max-w-[85%] ${m.role === "user" ? "bg-[#E8963F] text-[#2A2019] ml-auto" : "bg-white border border-[#C9A15C]/30 text-[#2A2019]"}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-[#C9A15C]/30 flex gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about your sales, profit..."
              className="flex-1 rounded-lg border border-[#C9A15C]/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8963F]"
            />
            <button onClick={send} className="rounded-lg bg-[#1F5C52] text-white px-3"><Send size={15} /></button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-4 w-12 h-12 rounded-full bg-[#7A2E3A] text-[#FBF4E8] shadow-xl flex items-center justify-center z-30 hover:bg-[#6a2732]"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}

// ---------- Roadmap ----------
const ROADMAP = [
  { title: "Full AI-generated lifestyle photos", desc: "Auto-create styled scene photos (not just backdrop treatments) once image generation is connected." },
  { title: "Live competitor price lookup", desc: "Search current competitor prices automatically per product instead of manual entry." },
  { title: "Direct bulk-upload template match", desc: "Match column structure to Meesho's exact current bulk-upload template format." },
  { title: "Return-reason breakdown", desc: "Parse actual return reason text from your export to tell you why items are returned, not just how often." },
];

function Roadmap() {
  return (
    <div className="rounded-2xl bg-white border border-[#C9A15C]/30 p-5">
      <p className="text-sm font-semibold text-[#7A2E3A] mb-3">Planned next</p>
      <div className="space-y-3">
        {ROADMAP.map((r, i) => (
          <div key={i} className="flex gap-3">
            <ChevronRight size={14} className="text-[#E8963F] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#2A2019]">{r.title}</p>
              <p className="text-xs text-[#5A4632]/70 mt-0.5">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#5A4632]/60 mt-4 pt-3 border-t border-[#C9A15C]/20">Note: dimensions can't be measured from a photo automatically — no tool can reliably do this from a single 2D image without a reference scale. Enter them yourself in the product form for accurate shipping-box sizing.</p>
    </div>
  );
}

// ---------- Main App ----------
function AppInner() {
  const [tab, setTab] = useState("bulk");

  const tabs = [
    { id: "bulk", label: "Bulk Catalogue Builder", icon: Sparkles },
    { id: "niche", label: "Niche Picker", icon: Target },
    { id: "competitor", label: "Competitor Tracker", icon: LineChartIcon },
    { id: "profit", label: "Profit Dashboard", icon: IndianRupee },
    { id: "charts", label: "Charts", icon: BarChart3 },
    { id: "ads", label: "Ad Planner", icon: Megaphone },
    { id: "analyzer", label: "Sales Analyzer", icon: PackageSearch },
    { id: "trending", label: "Trending Picks", icon: TrendingUp },
    { id: "roadmap", label: "What's Next", icon: Wand2 },
  ];

  return (
    <div className="min-h-screen bg-[#FBF4E8]" style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}>
      <header className="border-b border-[#C9A15C]/30 bg-[#FBF4E8]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#7A2E3A]" style={{ fontFamily: "'Georgia', serif" }}>Meesho Seller Toolkit</h1>
            <p className="text-xs text-[#5A4632]/70">Artificial Jewellery & Home-Kitchen desk</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-[#5A4632]/60 uppercase tracking-wide">Manual copy-paste tool</p>
            <p className="text-[10px] text-[#5A4632]/60">No account connection · no auto-clicking</p>
          </div>
        </div>
      </header>

      <nav className="max-w-5xl mx-auto px-5 pt-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${active ? "bg-[#7A2E3A] text-[#FBF4E8] border-[#7A2E3A]" : "bg-white/60 text-[#5A4632] border-[#C9A15C]/30 hover:border-[#7A2E3A]/40"}`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-5 py-6 pb-24">
        {tab === "bulk" && <BulkBuilder />}
        {tab === "niche" && <NichePicker />}
        {tab === "competitor" && <CompetitorTracker />}
        {tab === "profit" && <ProfitDashboard />}
        {tab === "charts" && <ChartsTab />}
        {tab === "ads" && <AdPlanner />}
        {tab === "analyzer" && <SalesAnalyzer />}
        {tab === "trending" && <Trending />}
        {tab === "roadmap" && <Roadmap />}
      </main>

      <footer className="max-w-5xl mx-auto px-5 pb-8 pt-4 text-center">
        <p className="text-[11px] text-[#5A4632]/50">Built for manual use — copy content into Meesho's Supplier Panel yourself to stay within their seller policies.</p>
      </footer>

      <ChatAssistant />
    </div>
  );
}

export default function App() {
  const [salesData, setSalesData] = useState(null);
  const [profitData, setProfitData] = useState(null);

  return (
    <StoreContext.Provider value={{ salesData, setSalesData, profitData, setProfitData }}>
      <AppInner />
    </StoreContext.Provider>
  );
}
