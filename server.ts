import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { seedDatabase } from './server/seedData.js';
import { authenticateToken } from './server/auth.js';

import authRoutes from './server/routes/authRoutes.js';
import productRoutes from './server/routes/productRoutes.js';
import cartRoutes from './server/routes/cartRoutes.js';
import checkoutRoutes from './server/routes/checkoutRoutes.js';
import orderRoutes from './server/routes/orderRoutes.js';
import paymentRoutes from './server/routes/paymentRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import seoRoutes from './server/routes/seoRoutes.js';
import supportRoutes from './server/routes/supportRoutes.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize and seed database if first run
  try {
    await seedDatabase();
  } catch (err) {
    console.error('Failed to seed database:', err);
  }

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic security and CORS headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Global token authentication
  app.use(authenticateToken);

  // SEO routes (robots.txt, sitemap.xml)
  app.use('/', seoRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', platform: 'BharatKart Indian E-Commerce', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/support', supportRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BharatKart Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
