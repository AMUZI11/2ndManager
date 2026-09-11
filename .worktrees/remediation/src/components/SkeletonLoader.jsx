"use client";
import React from 'react';

export function BentoSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome bar skeleton */}
      <div className="h-28 bg-[#FAF7F0] border border-[#E8DCC8] rounded-[2rem] p-6 animate-shimmer" />
      
      {/* Bento stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-white border border-gray-100 rounded-[2rem] p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F0] animate-shimmer" />
          <div className="w-24 h-4 bg-[#FAF7F0] rounded animate-shimmer" />
          <div className="w-32 h-6 bg-[#FAF7F0] rounded animate-shimmer" />
        </div>
        <div className="h-32 bg-white border border-gray-100 rounded-[2rem] p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F0] animate-shimmer" />
          <div className="w-24 h-4 bg-[#FAF7F0] rounded animate-shimmer" />
          <div className="w-32 h-6 bg-[#FAF7F0] rounded animate-shimmer" />
        </div>
        <div className="h-32 bg-white border border-gray-100 rounded-[2rem] p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F0] animate-shimmer" />
          <div className="w-24 h-4 bg-[#FAF7F0] rounded animate-shimmer" />
          <div className="w-32 h-6 bg-[#FAF7F0] rounded animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 3 }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4">
      <div className="flex justify-between items-center pb-2">
        <div className="w-40 h-5 bg-[#FAF7F0] rounded animate-shimmer" />
        <div className="w-24 h-8 bg-[#FAF7F0] rounded-xl animate-shimmer" />
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-4 py-2 border-b border-gray-50">
          <div className="h-3 bg-gray-100 rounded w-20 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-16 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-24 ml-auto animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-12 mx-auto animate-pulse" />
        </div>
        
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 py-4 items-center border-b border-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FAF7F0] animate-shimmer flex-shrink-0" />
              <div className="h-4 bg-[#FAF7F0] rounded w-32 animate-shimmer" />
            </div>
            <div className="h-4 bg-[#FAF7F0] rounded w-16 animate-shimmer" />
            <div className="h-4 bg-[#FAF7F0] rounded w-20 ml-auto animate-shimmer" />
            <div className="h-8 bg-[#FAF7F0] rounded-lg w-16 mx-auto animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FAF7F0] rounded-xl animate-shimmer flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-[#FAF7F0] rounded w-24 animate-shimmer" />
              <div className="h-3 bg-[#FAF7F0] rounded w-36 animate-shimmer" />
            </div>
          </div>
          <hr className="border-gray-50" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-[#FAF7F0] rounded-xl animate-shimmer" />
            <div className="h-10 bg-[#FAF7F0] rounded-xl animate-shimmer" />
          </div>
          <div className="h-10 bg-[#FAF7F0] rounded-xl animate-shimmer w-full" />
        </div>
      ))}
    </div>
  );
}
