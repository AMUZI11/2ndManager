export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/features', '/privacy', '/terms', '/refund'],
        disallow: [
          '/api/',
          '/pos/',
          '/dashboard/',
          '/products/',
          '/reorder/',
          '/consignments/',
          '/customers/',
          '/settings/',
          '/billing/',
          '/panic-dispatch/',
          '/admin/',
          '/superadmin/',
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://2ndmanager.vercel.app'}/sitemap.xml`,
  };
}
