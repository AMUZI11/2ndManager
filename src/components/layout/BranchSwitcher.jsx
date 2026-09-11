"use client";
import React from 'react';
import { Building2, MapPin } from 'lucide-react';

export default function BranchSwitcher({ shops = [], currentShopId = 'ALL', onSelectShop }) {
  if (!shops || shops.length === 0) return null;

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2 bg-[#0B0F17] border-2 md:border-[3px] border-amber-400 px-2.5 py-1 text-xs text-amber-400 font-mono font-bold shadow-[2px_2px_0px_#F59E0B] md:shadow-[3px_3px_0px_#F59E0B]">
        {currentShopId === 'ALL' ? (
          <Building2 size={14} className="text-amber-400 shrink-0" strokeWidth={2.5} />
        ) : (
          <MapPin size={14} className="text-amber-400 shrink-0" strokeWidth={2.5} />
        )}
        <select
          value={currentShopId || 'ALL'}
          onChange={(e) => onSelectShop && onSelectShop(e.target.value)}
          className="bg-[#0B0F17] text-amber-400 font-mono font-bold outline-none cursor-pointer pr-2 text-xs uppercase"
        >
          <option value="ALL" className="bg-[#0B0F17] text-amber-400">
            [ KONSOLIDASI (SEMUA TOKO) ]
          </option>
          {shops.map((s, idx) => {
            const label = s.branch_name || s.name || `Cabang ${idx + 1}`;
            const code = s.branch_code || `CBG-0${idx + 1}`;
            return (
              <option key={s.id} value={s.id} className="bg-[#0B0F17] text-amber-400">
                [ {code}: {label} ]
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
