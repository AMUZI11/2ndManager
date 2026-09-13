import React from 'react';

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse font-sans max-w-7xl mx-auto pb-12">
      {/* Header Bento Skeleton */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_#1e293b] flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-56 bg-slate-200 rounded-xl" />
          <div className="h-3.5 w-80 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* 4 Bento Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_0px_#1e293b] space-y-3">
            <div className="h-3.5 w-24 bg-slate-200 rounded-lg" />
            <div className="h-8 w-36 bg-slate-200 rounded-xl font-mono" />
            <div className="h-2.5 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table / Feed Skeleton */}
      <div className="bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0px_0px_#1e293b] p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded-xl" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-50 border-2 border-slate-200 rounded-xl flex items-center px-4 justify-between">
              <div className="h-4 w-48 bg-slate-200 rounded-lg" />
              <div className="h-4 w-28 bg-slate-200 rounded-lg font-mono" />
              <div className="h-4 w-20 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
