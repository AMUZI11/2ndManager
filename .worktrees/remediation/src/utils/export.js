/**
 * Client-side CSV Exporter Utility
 * Mengunduh array data langsung dari browser menjadi file .csv yang kompatibel dengan Excel (UTF-8 BOM).
 */
export function exportToCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    // Jika mengandung koma, kutip dua, atau baris baru, bungkus dengan kutip dua
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  // Gunakan UTF-8 BOM agar Excel menampilkan karakter Rupiah (Rp) dan tanda baca lokal dengan benar
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
