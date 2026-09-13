import React from 'react';

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse font-sans">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-zinc-800 rounded" />
          <div className="h-3 w-72 bg-zinc-900 rounded" />
        </div>
        <div className="h-8 w-32 bg-zinc-800 rounded" />
      </div>

      {/* 3 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="h-3 w-24 bg-zinc-800 rounded" />
          <div className="h-8 w-36 bg-zinc-800 rounded font-mono" />
          <div className="h-2 w-20 bg-zinc-850 rounded" />
        </div>
        <div className="h-28 bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="h-3 w-28 bg-zinc-800 rounded" />
          <div className="h-8 w-44 bg-zinc-800 rounded font-mono" />
          <div className="h-2 w-24 bg-zinc-850 rounded" />
        </div>
        <div className="h-28 bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="h-3 w-20 bg-zinc-800 rounded" />
          <div className="h-8 w-32 bg-zinc-800 rounded font-mono" />
          <div className="h-2 w-16 bg-zinc-850 rounded" />
        </div>
      </div>

      {/* Table / Feed Skeleton */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="h-4 w-36 bg-zinc-800 rounded" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 bg-zinc-900/80 border border-zinc-800/60 rounded flex items-center px-3 justify-between">
              <div className="h-3 w-40 bg-zinc-800 rounded" />
              <div className="h-3 w-24 bg-zinc-800 rounded font-mono" />
              <div className="h-3 w-16 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
