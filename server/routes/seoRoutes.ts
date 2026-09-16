import { Router } from 'express';
import { db } from '../db.js';
import { Product } from '../../src/types.js';

const router = Router();

// GET /robots.txt
router.get('/robots.txt', (req, res) => {
  const host = req.get('host') || 'bharatkart.in';
  const protocol = req.protocol || 'https';
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /checkout

Sitemap: ${protocol}://${host}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

// GET /sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  try {
    const host = req.get('host') || 'bharatkart.in';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    const productsCol = db.collection<Product>('products');
    const products = await productsCol.find({ status: 'ACTIVE' });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;

    products.forEach(p => {
      xml += `  <url>
    <loc>${baseUrl}/product/${p.slug}</loc>
    <lastmod>${new Date(p.updatedAt || p.createdAt || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err: any) {
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
