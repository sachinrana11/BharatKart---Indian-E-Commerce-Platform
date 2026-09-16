import { Router } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { Product } from '../../src/types.js';

const router = Router();

// GET /api/products - Advanced catalog search, filter, sort, pagination
router.get('/', async (req, res) => {
  try {
    const {
      q,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort = 'popular',
      page = '1',
      limit = '12',
    } = req.query;

    const productsCol = db.collection<Product>('products');
    let products = await productsCol.find({ status: { $ne: 'INACTIVE' } });

    // Text search
    if (q && typeof q === 'string' && q.trim()) {
      const queryStr = q.toLowerCase().trim();
      products = products.filter(
        p =>
          p.title.toLowerCase().includes(queryStr) ||
          p.brand.toLowerCase().includes(queryStr) ||
          p.category.toLowerCase().includes(queryStr) ||
          p.tags?.some(t => t.toLowerCase().includes(queryStr)) ||
          p.description.toLowerCase().includes(queryStr)
      );
    }

    // Category filter
    if (category && typeof category === 'string') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Subcategory filter
    if (subcategory && typeof subcategory === 'string') {
      products = products.filter(p => p.subcategory?.toLowerCase() === subcategory.toLowerCase());
    }

    // Brand filter
    if (brand && typeof brand === 'string') {
      const brandsList = brand.split(',').map(b => b.trim().toLowerCase());
      products = products.filter(p => brandsList.includes(p.brand.toLowerCase()));
    }

    // Price range
    if (minPrice) {
      const min = Number(minPrice);
      if (!isNaN(min)) products = products.filter(p => p.price >= min);
    }
    if (maxPrice) {
      const max = Number(maxPrice);
      if (!isNaN(max)) products = products.filter(p => p.price <= max);
    }

    // Rating filter
    if (minRating) {
      const r = Number(minRating);
      if (!isNaN(r)) products = products.filter(p => p.rating >= r);
    }

    // In stock filter
    if (inStock === 'true' || inStock === '1') {
      products = products.filter(p => p.stock > 0);
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating_desc':
        products.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'discount_desc':
        products.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
        break;
      case 'popular':
      default:
        products.sort((a, b) => (b.reviewCount || 0) * (b.rating || 0) - (a.reviewCount || 0) * (a.rating || 0));
        break;
    }

    const total = products.length;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 12);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = products.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: paginatedProducts,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch products' });
  }
});

// GET /api/products/autocomplete
router.get('/autocomplete', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.json({ success: true, data: [] });
  }

  const queryStr = q.toLowerCase().trim();
  const productsCol = db.collection<Product>('products');
  const all = await productsCol.find({ status: { $ne: 'INACTIVE' } });

  const matches = all
    .filter(
      p =>
        p.title.toLowerCase().includes(queryStr) ||
        p.brand.toLowerCase().includes(queryStr) ||
        p.category.toLowerCase().includes(queryStr)
    )
    .slice(0, 6)
    .map(p => ({
      _id: p._id,
      title: p.title,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      price: p.price,
      thumbnail: p.thumbnail,
    }));

  res.json({ success: true, data: matches });
});

// GET /api/products/recommendations
router.get('/recommendations', async (req, res) => {
  const productsCol = db.collection<Product>('products');
  const all = await productsCol.find({ status: { $ne: 'INACTIVE' } });

  const featured = all.filter(p => p.isFeatured).slice(0, 8);
  const trending = all.filter(p => p.isTrending).slice(0, 8);
  const bestSellers = all.filter(p => p.isBestSeller).slice(0, 8);
  const newArrivals = all.filter(p => p.isNewArrival).slice(0, 8);

  res.json({
    success: true,
    data: {
      featured: featured.length ? featured : all.slice(0, 4),
      trending: trending.length ? trending : all.slice(2, 6),
      bestSellers: bestSellers.length ? bestSellers : all.slice(0, 4),
      newArrivals: newArrivals.length ? newArrivals : all.slice(4, 8),
    },
  });
});

// GET /api/products/:slugOrId
router.get('/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;
  const productsCol = db.collection<Product>('products');

  let product = await productsCol.findOne({ slug: slugOrId });
  if (!product) {
    product = await productsCol.findOne({ _id: slugOrId });
  }

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  // Related products from same category or brand
  const related = await productsCol.find({
    _id: { $ne: product._id },
    $or: [{ category: product.category }, { brand: product.brand }],
  }, { limit: 4 });

  res.json({
    success: true,
    data: {
      ...product,
      relatedProducts: related,
    },
  });
});

// GET /api/products/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const reviewsCol = db.collection('reviews');
  const reviews = await reviewsCol.find(
    { productId: id, status: 'APPROVED' },
    { sort: { createdAt: -1 } }
  );

  res.json({ success: true, data: reviews });
});

// POST /api/products/:id/reviews
router.post('/:id/reviews', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, error: 'Rating and review comment are required.' });
    }

    const productsCol = db.collection<Product>('products');
    const product = await productsCol.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // Check if user actually purchased this product for verified badge
    const ordersCol = db.collection('orders');
    const pastOrder = await ordersCol.findOne({
      userId: req.user!._id,
      paymentStatus: 'PAID',
      'items.productId': id,
    });

    const reviewsCol = db.collection('reviews');
    const review = await reviewsCol.insertOne({
      productId: id,
      userId: req.user!._id,
      userName: req.user!.name,
      userAvatar: req.user!.avatar,
      rating: Math.min(5, Math.max(1, Number(rating))),
      title: title?.trim() || 'Verified Customer Review',
      comment: comment.trim(),
      verifiedPurchase: !!pastOrder,
      helpfulVotes: 0,
      status: 'APPROVED',
    });

    // Update product average rating & review count
    const allApprovedReviews = await reviewsCol.find({ productId: id, status: 'APPROVED' });
    const avg = allApprovedReviews.reduce((acc, r) => acc + r.rating, 0) / allApprovedReviews.length;
    await productsCol.updateOne(
      { _id: id },
      {
        $set: {
          rating: Number(avg.toFixed(1)),
          reviewCount: allApprovedReviews.length,
        },
      }
    );

    res.status(201).json({
      success: true,
      message: 'Thank you! Your verified review has been published.',
      data: review,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to submit review' });
  }
});

// GET /api/categories
router.get('/meta/categories', async (req, res) => {
  const categoriesCol = db.collection('categories');
  const categories = await categoriesCol.find({});
  res.json({ success: true, data: categories });
});

// GET /api/brands
router.get('/meta/brands', async (req, res) => {
  const brandsCol = db.collection('brands');
  const brands = await brandsCol.find({});
  res.json({ success: true, data: brands });
});

// GET /api/banners
router.get('/meta/banners', async (req, res) => {
  const bannersCol = db.collection('banners');
  const banners = await bannersCol.find({ isActive: true }, { sort: { order: 1 } });
  res.json({ success: true, data: banners });
});

// GET /api/flash-sales
router.get('/meta/flash-sales', async (req, res) => {
  const flashSalesCol = db.collection('flashSales');
  const productsCol = db.collection<Product>('products');
  const flashSale = await flashSalesCol.findOne({ isActive: true });

  if (!flashSale) {
    return res.json({ success: true, data: null });
  }

  const saleProducts = await productsCol.find({
    _id: { $in: flashSale.productIds || [] },
  });

  res.json({
    success: true,
    data: {
      ...flashSale,
      products: saleProducts,
    },
  });
});

export default router;
