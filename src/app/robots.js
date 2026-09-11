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
    sitemap: 'https://2ndmanager.com/sitemap.xml',
  };
}
