import React from 'react';
import { formatRupiah } from '@/utils/format';

const formatRupiahShort = (val) => {
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(1)}jt`;
  } else if (val >= 1000) {
    return `${(val / 1000).toFixed(0)}rb`;
  }
  return String(val);
};



// ─── MONTHLY TREND BAR CHART ────────────────────────────────────────────────
export function MonthlyTrendChart({ data = [] }) {
  // Expected data structure: [{ monthLabel: 'Juni 2026', omzet: 5000000, piutang: 1200000 }]
  const chartHeight = 220;
  const chartWidth = 500;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const contentWidth = chartWidth - paddingLeft - paddingRight;
  const contentHeight = chartHeight - paddingTop - paddingBottom;

  // Fallback to empty look if no data
  const chartData = data.length > 0 ? data.slice(-6) : [
    { monthLabel: 'Jan', omzet: 0, piutang: 0 },
    { monthLabel: 'Feb', omzet: 0, piutang: 0 },
    { monthLabel: 'Mar', omzet: 0, piutang: 0 }
  ];

  // Find max value for scaling
  const maxVal = Math.max(
    10000,
    ...chartData.map(d => Math.max(d.omzet, d.piutang))
  ) * 1.15; // 15% safety padding on top

  const getX = (index) => {
    const spacing = contentWidth / chartData.length;
    return paddingLeft + index * spacing + spacing / 2;
  };

  const getY = (value) => {
    return paddingTop + contentHeight - (value / maxVal) * contentHeight;
  };

  // Generate gridline levels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => maxVal * p);

  return (
    <div className="bg-white rounded-3xl border border-gray-150/40 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-heading font-bold text-sm text-[#3D1A0F]">Tren Finansial Bulanan</h3>
          <p className="text-[11px] text-[#6B4F3A]">Perbandingan Penjualan Lunas vs Outstanding Piutang</p>
        </div>
        <div className="flex gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
            <span className="text-[#1C1009]">Omzet Lunas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-rose-500 rounded-sm" />
            <span className="text-[#1C1009]">Piutang</span>
          </div>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
          {/* Gradients */}
          <defs>
            <linearGradient id="omzetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="piutangGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {yTicks.map((val, i) => {
            const y = getY(val);
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={chartWidth - paddingRight} 
                  y2={y} 
                  stroke="#E8DCC8" 
                  strokeDasharray="4 4" 
                  strokeWidth="1"
                  opacity={i === 0 ? "0.8" : "0.4"}
                />
                <text 
                  x={paddingLeft - 8} 
                  y={y + 4} 
                  fill="#6B4F3A" 
                  fontSize="10" 
                  fontWeight="bold"
                  textAnchor="end"
                  className="font-mono"
                >
                  {formatRupiahShort(val)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((d, index) => {
            const xCenter = getX(index);
            const barWidth = Math.min(22, contentWidth / chartData.length * 0.3);
            const offset = barWidth / 2 + 2;

            const xOmzet = xCenter - offset;
            const yOmzet = getY(d.omzet);
            const hOmzet = Math.max(1, contentHeight - (yOmzet - paddingTop));

            const xPiutang = xCenter + offset;
            const yPiutang = getY(d.piutang);
            const hPiutang = Math.max(1, contentHeight - (yPiutang - paddingTop));

            return (
              <g key={index} className="group">
                {/* Tooltip trigger overlays */}
                <title>{`${d.monthLabel}\nOmzet Lunas: ${formatRupiah(d.omzet)}\nPiutang: ${formatRupiah(d.piutang)}`}</title>

                {/* Omzet Bar */}
                <rect 
                  x={xOmzet} 
                  y={yOmzet} 
                  width={barWidth} 
                  height={hOmzet} 
                  fill="url(#omzetGrad)" 
                  rx="4"
                  className="transition-all duration-300 hover:brightness-110"
                />

                {/* Piutang Bar */}
                <rect 
                  x={xPiutang} 
                  y={yPiutang} 
                  width={barWidth} 
                  height={hPiutang} 
                  fill="url(#piutangGrad)" 
                  rx="4"
                  className="transition-all duration-300 hover:brightness-110"
                />

                {/* Axis Month Label */}
                <text 
                  x={xCenter} 
                  y={chartHeight - 15} 
                  fill="#1C1009" 
                  fontSize="10" 
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {d.monthLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── CATEGORY SALES DONUT CHART ─────────────────────────────────────────────
export function CategoryPieChart({ data = {} }) {
  // Expected data structure: { LM: 12500000, BR: 5500000, CUSTOM: 1500000 }
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);

  const colors = {
    LM: { bg: 'bg-emerald-500', fill: '#10B981' },
    BR: { bg: 'bg-amber-500', fill: '#F59E0B' },
    OTHER: { bg: 'bg-sky-500', fill: '#0EA5E9' }
  };

  const segments = Object.entries(data).map(([code, val]) => {
    const color = colors[code] || colors.OTHER;
    const pct = total > 0 ? (val / total) * 100 : 0;
    return {
      code,
      value: val,
      percentage: pct,
      color
    };
  }).filter(s => s.value > 0);

  // Setup circle properties for donut path
  const radius = 55;
  const strokeWidth = 14;
  const circ = 2 * Math.PI * radius;
  const size = 160;
  const center = size / 2;

  let currentOffset = 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-150/40 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4">
      <div>
        <h3 className="font-heading font-bold text-sm text-[#3D1A0F]">Proporsi Kategori</h3>
        <p className="text-[11px] text-[#6B4F3A]">Kontribusi Omzet Lunas berdasarkan Tipe Minuman</p>
      </div>

      {total === 0 ? (
        <div className="h-[140px] flex items-center justify-center text-xs text-[#6B4F3A] font-semibold bg-[#FAF7F0]/40 rounded-2xl border border-dashed border-[#E8DCC8]">
          Tidak ada data penjualan
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
          {/* Donut SVG */}
          <div className="relative w-36 h-36">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle 
                cx={center} 
                cy={center} 
                r={radius} 
                fill="transparent" 
                stroke="#FAF7F0" 
                strokeWidth={strokeWidth} 
              />

              {segments.map((seg, i) => {
                const strokeDash = `${(seg.percentage / 100) * circ} ${circ}`;
                const offset = circ - currentOffset;
                currentOffset += (seg.percentage / 100) * circ;

                return (
                  <circle 
                    key={seg.code}
                    cx={center} 
                    cy={center} 
                    r={radius} 
                    fill="transparent" 
                    stroke={seg.color.fill} 
                    strokeWidth={strokeWidth} 
                    strokeDasharray={strokeDash}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                  >
                    <title>{`${seg.code}: ${formatRupiah(seg.value)} (${seg.percentage.toFixed(1)}%)`}</title>
                  </circle>
                );
              })}
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-extrabold text-[#6B4F3A] tracking-wider">Total</span>
              <span className="text-xs font-black text-[#3D1A0F] font-mono tabular-nums leading-none mt-0.5">
                {formatRupiahShort(total)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 text-xs flex-1 max-w-[140px]">
            {segments.map((seg) => (
              <div key={seg.code} className="flex items-center justify-between gap-2 border-b border-gray-50 pb-1.5 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${seg.color.bg} flex-shrink-0`} />
                  <span className="font-bold text-[#1C1009] truncate">{seg.code}</span>
                </div>
                <span className="font-mono font-extrabold text-[#6B4F3A]">
                  {seg.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
