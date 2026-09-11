import React from 'react';
import { BarChart2, PieChart } from 'lucide-react';

const formatRupiahShort = (val) => {
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(1)}jt`;
  } else if (val >= 1000) {
    return `${(val / 1000).toFixed(0)}rb`;
  }
  return String(val);
};

const formatRupiah = (val) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

// ─── MONTHLY TREND BAR CHART ────────────────────────────────────────────────
export function MonthlyTrendChart({ data = [] }) {
  const chartHeight = 220;
  const chartWidth = 500;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const contentWidth = chartWidth - paddingLeft - paddingRight;
  const contentHeight = chartHeight - paddingTop - paddingBottom;

  const hasRealData = data && data.length > 0 && data.some(d => (d.omzet || 0) > 0 || (d.piutang || 0) > 0);

  // Fallback data
  const chartData = hasRealData ? data.slice(-6) : [
    { monthLabel: 'Jan', omzet: 0, piutang: 0 },
    { monthLabel: 'Feb', omzet: 0, piutang: 0 },
    { monthLabel: 'Mar', omzet: 0, piutang: 0 }
  ];

  // Find max value for scaling
  const maxVal = Math.max(
    10000,
    ...chartData.map(d => Math.max(d.omzet || 0, d.piutang || 0))
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
    <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-3">
        <div>
          <h3 className="font-display font-black text-sm uppercase text-slate-900">Tren Finansial Bulanan</h3>
          <p className="text-[10px] font-mono text-slate-500">Perbandingan Omzet Lunas vs Outstanding Piutang</p>
        </div>
        <div className="flex gap-4 text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#CCFF00] border border-slate-800 rounded-sm" />
            <span className="text-slate-800">Omzet Lunas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-amber-400 border border-slate-800 rounded-sm" />
            <span className="text-slate-800">Piutang</span>
          </div>
        </div>
      </div>

      {!hasRealData ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-800 text-slate-700 flex items-center justify-center shadow-[2px_2px_0px_#1E293B]">
            <BarChart2 size={20} />
          </div>
          <p className="text-xs font-mono font-bold text-slate-800 uppercase">Belum ada data penjualan</p>
          <p className="text-[10px] text-slate-500 font-sans">Lakukan transaksi di Kasir POS untuk melihat grafik tren bulanan.</p>
        </div>
      ) : (
        <div className="relative w-full">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
            {/* Gradients */}
            <defs>
              <linearGradient id="omzetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CCFF00" stopOpacity="1" />
                <stop offset="100%" stopColor="#99CC00" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="piutangGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.9" />
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
                    stroke="#E2E8F0" 
                    strokeDasharray="4 4" 
                    strokeWidth="1.5"
                    opacity={i === 0 ? "1" : "0.7"}
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={y + 4} 
                    fill="#64748B" 
                    fontSize="9" 
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
              const barWidth = Math.min(20, contentWidth / chartData.length * 0.3);
              const offset = barWidth / 2 + 2;

              const xOmzet = xCenter - offset;
              const yOmzet = getY(d.omzet);
              const hOmzet = Math.max(1, contentHeight - (yOmzet - paddingTop));

              const xPiutang = xCenter + offset;
              const yPiutang = getY(d.piutang);
              const hPiutang = Math.max(1, contentHeight - (yPiutang - paddingTop));

              return (
                <g key={index} className="group">
                  <title>{`${d.monthLabel}\nOmzet Lunas: ${formatRupiah(d.omzet)}\nPiutang: ${formatRupiah(d.piutang)}`}</title>

                  {/* Omzet Bar */}
                  <rect 
                    x={xOmzet} 
                    y={yOmzet} 
                    width={barWidth} 
                    height={hOmzet} 
                    fill="url(#omzetGrad)" 
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    rx="3"
                    className="transition-all duration-300 hover:brightness-110"
                  />

                  {/* Piutang Bar */}
                  <rect 
                    x={xPiutang} 
                    y={yPiutang} 
                    width={barWidth} 
                    height={hPiutang} 
                    fill="url(#piutangGrad)" 
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    rx="3"
                    className="transition-all duration-300 hover:brightness-110"
                  />

                  {/* Axis Month Label */}
                  <text 
                    x={xCenter} 
                    y={chartHeight - 15} 
                    fill="#1E293B" 
                    fontSize="9" 
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    {d.monthLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── CATEGORY SALES DONUT CHART ─────────────────────────────────────────────
export function CategoryPieChart({ data = {} }) {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);

  const colors = {
    LM: { bg: 'bg-[#CCFF00]', fill: '#CCFF00' },
    BR: { bg: 'bg-amber-400', fill: '#FBBF24' },
    OTHER: { bg: 'bg-indigo-400', fill: '#818CF8' }
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
    <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[4px_4px_0px_#1E293B] p-6 space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <h3 className="font-display font-black text-sm uppercase text-slate-900">Proporsi Kategori</h3>
        <p className="text-[10px] font-mono text-slate-500">Kontribusi Omzet Lunas per Kategori Minuman</p>
      </div>

      {total === 0 ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-800 text-slate-700 flex items-center justify-center shadow-[2px_2px_0px_#1E293B]">
            <PieChart size={20} />
          </div>
          <p className="text-xs font-mono font-bold text-slate-800 uppercase">Belum ada data proporsi</p>
          <p className="text-[10px] text-slate-500 font-sans">Data kategori akan terisi otomatis seiring transaksi dicatat.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
          {/* Donut SVG */}
          <div className="relative w-36 h-36">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle 
                cx={center} 
                cy={center} 
                r={radius} 
                fill="transparent" 
                stroke="#F1F5F9" 
                strokeWidth={strokeWidth} 
              />

              {segments.map((seg) => {
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
              <span className="text-[9px] uppercase font-mono font-bold text-slate-500 tracking-wider">Total</span>
              <span className="text-sm font-black text-slate-900 font-mono tabular-nums leading-none mt-0.5">
                {formatRupiahShort(total)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 text-xs flex-1 max-w-[160px]">
            {segments.map((seg) => (
              <div key={seg.code} className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-sm ${seg.color.bg} border border-slate-800 flex-shrink-0`} />
                  <span className="font-bold text-slate-900 text-xs truncate">{seg.code}</span>
                </div>
                <span className="font-mono font-extrabold text-slate-900 text-xs">
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

