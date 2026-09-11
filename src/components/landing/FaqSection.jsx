"use client";
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "Apakah sistem ini jalan tanpa internet?",
      answer: "Tentu. Sistem dapat berjalan offline penuh. Data akan otomatis disinkronkan ke cloud saat koneksi internet kembali tersedia. Anda tidak akan pernah kehilangan data penjualan."
    },
    {
      question: "Apakah saya harus beli alat khusus?",
      answer: "Tidak. Anda bisa langsung menggunakan HP Android, iPhone, iPad, atau Laptop yang sudah ada. Jika ingin mencetak struk, sistem kami mendukung 99% printer kasir bluetooth di pasaran."
    },
    {
      question: "Data kasbon saya aman?",
      answer: "Sangat aman. Kami menggunakan enkripsi level bank. Hanya Anda sebagai Pemilik (Admin) yang memiliki akses penuh. Kasir hanya bisa melakukan input tanpa bisa menghapus atau memanipulasi riwayat."
    },
    {
      question: "Berapa lama proses setup awal?",
      answer: "Kurang dari 2 menit untuk membuat akun. Memasukkan ratusan produk sangat mudah dengan fitur Scan Barcode dan database katalog pintar kami yang otomatis mendeteksi nama produk dari barcode."
    }
  ];

  return (
    <section className="py-24 bg-transparent relative z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-sans font-extrabold tracking-tighter text-kw-accent mb-4 drop-shadow-md">
            Pertanyaan Sering Diajukan
          </h2>
          <p className="text-kw-text text-xl">
            Masih ragu? Kami menjawab keraguan Anda.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-[#8C2818]/40 backdrop-blur-md border border-kw-border rounded-2xl overflow-hidden transition-all duration-300 shadow-[8px_8px_16px_#1A0F0A,_-4px_-4px_12px_rgba(197,160,89,0.1)]"
            >
              <button
                className="w-full px-6 py-6 text-left flex justify-between items-center focus:outline-none hover:bg-[#8C2818]/60 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-bold text-lg font-sans tracking-tight text-kw-accent pr-8">{faq.question}</span>
                <ChevronDown 
                  className={`w-6 h-6 text-kw-accent shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} 
                />
              </button>
              
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-kw-text leading-relaxed text-lg border-t border-kw-border pt-4">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
