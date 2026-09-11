import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const BASE_URL = 'https://2ndmanager.com';

/**
 * Semantic Breadcrumbs with Schema.org BreadcrumbList JSON-LD
 * @param {Array<{ label: string, href?: string }>} items
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  // Build JSON-LD itemListElement
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      item: item.href ? (item.href.startsWith('http') ? item.href : `${BASE_URL}${item.href}`) : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isFirst = index === 0;

            return (
              <li key={item.label || index} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight size={13} className="text-slate-400 shrink-0" strokeWidth={2.5} />
                )}
                {isLast || !item.href ? (
                  <span
                    aria-current="page"
                    className="text-slate-900 font-extrabold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-slate-900 transition-colors flex items-center gap-1 hover:underline decoration-2 underline-offset-2"
                  >
                    {isFirst && <Home size={13} strokeWidth={2.5} className="text-slate-600" />}
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
