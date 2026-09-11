export function formatCurrency(val, currencyCode = 'IDR', locale = 'id-ID') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(val || 0));
}

export const formatRupiah = (val) => formatCurrency(val, 'IDR', 'id-ID');

export function getTerbacaRupiah(amountStr, currencyCode = 'IDR', locale = 'id-ID', unitLabels = {}) {
  const num = parseInt(amountStr);
  if (isNaN(num) || num <= 0) return '';

  const labels = {
    million: unitLabels.million ?? 'Juta',
    thousand: unitLabels.thousand ?? 'Ribu',
  };

  const formatted = formatCurrency(num, currencyCode, locale);

  if (num >= 1_000_000) {
    const unit = num / 1_000_000;
    return `Terbaca: ${formatted} (${unit % 1 === 0 ? unit : unit.toFixed(2)} ${labels.million})`;
  } else if (num >= 1_000) {
    const unit = num / 1_000;
    return `Terbaca: ${formatted} (${unit % 1 === 0 ? unit : unit.toFixed(1)} ${labels.thousand})`;
  }
  return `Terbaca: ${formatted}`;
}
