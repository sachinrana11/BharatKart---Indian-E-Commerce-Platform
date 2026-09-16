import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { Product, Category, Brand, Banner, Coupon, FlashSale, Review, Order, Address, SupportTicket } from '../src/types.js';

export async function seedDatabase() {
  const usersCol = db.collection('users');
  const productsCol = db.collection('products');
  const categoriesCol = db.collection('categories');
  const brandsCol = db.collection('brands');
  const bannersCol = db.collection('banners');
  const couponsCol = db.collection('coupons');
  const flashSalesCol = db.collection('flashSales');
  const reviewsCol = db.collection('reviews');
  const ordersCol = db.collection('orders');
  const addressesCol = db.collection('addresses');
  const auditLogsCol = db.collection('auditLogs');
  const ticketsCol = db.collection<SupportTicket>('support_tickets');

  // Check if already seeded
  const userCount = await usersCol.countDocuments();
  const ticketCount = await ticketsCol.countDocuments();

  if (userCount > 0 && ticketCount > 0) {
    console.log('Database already seeded. Skipping initial seeding.');
    return;
  }

  if (userCount > 0 && ticketCount === 0) {
    // Seed sample support tickets for existing user
    await ticketsCol.insertMany([
      {
        _id: 'tkt_seed_01',
        ticketNumber: 'TKT-9182',
        userId: 'usr_rahul_01',
        userName: 'Rahul Sharma',
        userEmail: 'rahul.sharma@example.com',
        orderId: 'ord_sample_984712',
        orderNumber: 'BK-2026-984712',
        subject: 'Estimated delivery slot for today\'s BlueDart parcel',
        category: 'ORDER_STATUS',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        messages: [
          {
            id: 'msg_seed_01',
            sender: 'USER',
            senderName: 'Rahul Sharma',
            text: 'Namaste, my order shows Out for Delivery by BlueDart executive Santosh. Will it arrive before 5:00 PM today at Fort, Mumbai?',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            orderContext: {
              orderNumber: 'BK-2026-984712',
              status: 'OUT_FOR_DELIVERY',
              totalAmount: 2399,
              trackingNumber: 'BLUEDART-901827364',
              courierPartner: 'BlueDart Air Express',
            },
          },
          {
            id: 'msg_seed_02',
            sender: 'AGENT',
            senderName: 'BharatKart Care Support',
            text: 'Namaste Rahul ji! We spoke with BlueDart Fort Delivery hub. Delivery executive Santosh K. has scheduled your drop for between 2:30 PM and 4:30 PM today. A 4-digit delivery security PIN has been sent via SMS.',
            timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
      {
        _id: 'tkt_seed_02',
        ticketNumber: 'TKT-8240',
        userId: 'usr_rahul_01',
        userName: 'Rahul Sharma',
        userEmail: 'rahul.sharma@example.com',
        subject: 'Inquiry regarding GST input tax credit invoice format',
        category: 'GENERAL',
        status: 'RESOLVED',
        priority: 'LOW',
        messages: [
          {
            id: 'msg_seed_03',
            sender: 'USER',
            senderName: 'Rahul Sharma',
            text: 'Can I add my firm GSTIN on the tax invoice for B2B input tax credit claiming?',
            timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
          },
          {
            id: 'msg_seed_04',
            sender: 'AGENT',
            senderName: 'BharatKart Care Support',
            text: 'Yes! All BharatKart invoices feature full 18% CGST/SGST/IGST breakdowns compliant with the GST Council. You can input your 15-digit GSTIN under Profile > Tax Details to reflect on all upcoming tax invoices.',
            timestamp: new Date(Date.now() - 86400000 * 3 + 1800000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3 + 1800000).toISOString(),
      },
    ]);
    console.log('Sample customer support tickets seeded for existing user!');
    return;
  }

  console.log('Seeding fresh database for BharatKart...');

  // 1. Users
  const userPasswordHash = bcrypt.hashSync('user123', 8);
  const adminPasswordHash = bcrypt.hashSync('admin123', 8);
  const superAdminPasswordHash = bcrypt.hashSync('super123', 8);

  const customerUser = await usersCol.insertOne({
    _id: 'usr_rahul_01',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+91 98765 43210',
    passwordHash: userPasswordHash,
    role: 'CUSTOMER',
    isEmailVerified: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  const customerUser2 = await usersCol.insertOne({
    _id: 'usr_priya_02',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+91 98234 56789',
    passwordHash: userPasswordHash,
    role: 'CUSTOMER',
    isEmailVerified: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  });

  const adminUser = await usersCol.insertOne({
    _id: 'usr_admin_01',
    name: 'Ananya Verma (Store Manager)',
    email: 'admin@bharatkart.in',
    phone: '+91 91234 56780',
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    isEmailVerified: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  });

  const superAdminUser = await usersCol.insertOne({
    _id: 'usr_super_01',
    name: 'Vikramaditya Rao (Founder & SuperAdmin)',
    email: 'superadmin@bharatkart.in',
    phone: '+91 99999 88888',
    passwordHash: superAdminPasswordHash,
    role: 'SUPER_ADMIN',
    isEmailVerified: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  });

  // 2. Addresses for Rahul Sharma
  const defaultAddress: Address = {
    _id: 'addr_rahul_01',
    userId: 'usr_rahul_01',
    fullName: 'Rahul Sharma',
    phone: '9876543210',
    alternatePhone: '9876543211',
    pincode: '400001',
    locality: 'Fort, Colaba',
    addressLine: 'Flat 402, Sea View Towers, Shahid Bhagat Singh Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    landmark: 'Near Standard Chartered Bank',
    type: 'HOME',
    isDefault: true,
    createdAt: new Date().toISOString(),
  };

  const workAddress: Address = {
    _id: 'addr_rahul_02',
    userId: 'usr_rahul_01',
    fullName: 'Rahul Sharma',
    phone: '9876543210',
    pincode: '400051',
    locality: 'Bandra Kurla Complex (BKC)',
    addressLine: 'Floor 7, Maker Maxity, Commercial Block B',
    city: 'Mumbai',
    state: 'Maharashtra',
    landmark: 'Opposite Jio World Convention Centre',
    type: 'WORK',
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  await addressesCol.insertMany([defaultAddress, workAddress]);

  // 3. Categories
  const categories: Category[] = [
    {
      _id: 'cat_electronics',
      name: 'Electronics & Gadgets',
      slug: 'electronics',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
      icon: 'Smartphone',
      subcategories: ['Headphones & Audio', 'Smartwatches', 'Mobile Accessories', 'Laptops & Computing', 'Power Banks'],
      itemCount: 42,
    },
    {
      _id: 'cat_fashion',
      name: 'Indian Ethnic & Modern Fashion',
      slug: 'fashion',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80',
      icon: 'Shirt',
      subcategories: ['Men Kurta & Sherwani', 'Women Sarees & Kurtis', 'Footwear', 'Watches & Jewellery'],
      itemCount: 56,
    },
    {
      _id: 'cat_home',
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&auto=format&fit=crop&q=80',
      icon: 'Home',
      subcategories: ['Cookware & Appliances', 'Brass & Copper Utensils', 'Home Decor & Diyas', 'Bedding & Linen'],
      itemCount: 38,
    },
    {
      _id: 'cat_beauty',
      name: 'Ayurvedic Beauty & Wellness',
      slug: 'beauty-wellness',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
      icon: 'Sparkles',
      subcategories: ['Kumkumadi & Face Oils', 'Herbal Haircare', 'Organic Soaps', 'Fragrance & Attar'],
      itemCount: 29,
    },
    {
      _id: 'cat_grocery',
      name: 'Spices, Dry Fruits & Sweets',
      slug: 'grocery-sweets',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
      icon: 'ShoppingBag',
      subcategories: ['Kashmiri Saffron & Spices', 'Mithai & Traditional Sweets', 'Organic Ghee & Honey', 'Premium Dry Fruits'],
      itemCount: 24,
    },
  ];

  await categoriesCol.insertMany(categories);

  // 4. Brands
  const brands: Brand[] = [
    { _id: 'br_boat', name: 'boAt', slug: 'boat', logo: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&auto=format&fit=crop&q=80', isPopular: true },
    { _id: 'br_noise', name: 'Noise', slug: 'noise', logo: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80', isPopular: true },
    { _id: 'br_oneplus', name: 'OnePlus', slug: 'oneplus', logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80', isPopular: true },
    { _id: 'br_titan', name: 'Titan', slug: 'titan', logo: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=100&auto=format&fit=crop&q=80', isPopular: true },
    { _id: 'br_fabindia', name: 'FabIndia', slug: 'fabindia', logo: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&auto=format&fit=crop&q=80', isPopular: true },
    { _id: 'br_mamaearth', name: 'Mamaearth', slug: 'mamaearth', logo: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=100&auto=format&fit=crop&q=80', isPopular: true },
    { _id: 'br_prestige', name: 'Prestige', slug: 'prestige', logo: 'https://images.unsplash.com/photo-1585695603586-538965004ec9?w=100&auto=format&fit=crop&q=80', isPopular: true },
    { _id: 'br_forest', name: 'Forest Essentials', slug: 'forest-essentials', logo: 'https://images.unsplash.com/photo-1608248597359-24706596101c?w=100&auto=format&fit=crop&q=80', isPopular: true },
  ];

  await brandsCol.insertMany(brands);

  // 5. Products
  const products: Product[] = [
    {
      _id: 'prd_boat_nirvana',
      title: 'boAt Nirvana Ion ANC Noise Cancelling Earbuds with 120H Playtime',
      slug: 'boat-nirvana-ion-anc-earbuds',
      brand: 'boAt',
      category: 'Electronics & Gadgets',
      subcategory: 'Headphones & Audio',
      description: 'Experience pure musical serenity with boAt Nirvana Ion ANC featuring Crystal Bionic Sound powered by HiFi DSP, 32dB Active Noise Cancellation, and an astonishing 120 hours of total playback time. Designed for Indian audiophiles.',
      features: [
        '32dB Active Noise Cancellation with Transparency Mode',
        'Crystal Bionic Sound powered by HiFi DSP',
        'Massive 120 Hours Total Playback (24 Hours per single charge)',
        'Quad Mics with ENx Technology for crisp calls in Indian traffic',
        'Beast Mode with 60ms ultra-low latency for mobile gaming',
        'IPX4 Sweat and Splash Resistance'
      ],
      specifications: {
        'Battery Life': 'Up to 120 Hours Total',
        'Noise Cancellation': '32dB Active Noise Cancellation',
        'Bluetooth Version': 'v5.3 with Instant Wake N Pair (IWP)',
        'Driver Size': '10mm Dual Drivers',
        'Charging Time': 'ASAP Charge (10 mins = 5 hours)',
        'Warranty': '1 Year boAt India Warranty'
      },
      images: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80',
      mrp: 9990,
      price: 2499,
      discountPercent: 75,
      rating: 4.6,
      reviewCount: 1420,
      isFeatured: true,
      isTrending: true,
      isBestSeller: true,
      sku: 'BOAT-NIRV-01',
      stock: 45,
      lowStockThreshold: 10,
      status: 'ACTIVE',
      tags: ['audio', 'earbuds', 'anc', 'boat', 'wireless'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7,
      variants: [
        {
          id: 'v_color',
          name: 'Color',
          type: 'color',
          options: [
            { id: 'opt_black', name: 'Charcoal Black', sku: 'BOAT-NIRV-BLK', priceOffset: 0, stock: 25 },
            { id: 'opt_silver', name: 'Silver Frost', sku: 'BOAT-NIRV-SLV', priceOffset: 100, stock: 20 }
          ]
        }
      ]
    },
    {
      _id: 'prd_noise_colorfit',
      title: 'Noise ColorFit Pro 5 Max Smartwatch with 1.96" AMOLED & BT Calling',
      slug: 'noise-colorfit-pro-5-max',
      brand: 'Noise',
      category: 'Electronics & Gadgets',
      subcategory: 'Smartwatches',
      description: 'Elevate your daily hustle with Noise ColorFit Pro 5 Max. Flaunting a brilliant 1.96" AMOLED display with always-on feature, functional stainless steel crown, Tru Sync Bluetooth Calling, and comprehensive 24/7 health tracking suite.',
      features: [
        '1.96" High-Definition Super AMOLED Display (410x502 resolution)',
        'Functional Stainless Steel Rotating Crown',
        'Tru Sync Bluetooth Calling with quick dial pad and favorite contacts',
        '100+ Sports Modes with Auto Sports Detection',
        'Noise Health Suite: 24x7 Heart Rate, SpO2, Sleep Monitor & Stress',
        'IP68 Water and Dust Resistance'
      ],
      specifications: {
        'Display': '1.96" AMOLED (500 nits brightness)',
        'Battery': '7 Days Typical Usage, 2 Days with BT Calling',
        'Compatibility': 'Android 9.0+ and iOS 11.0+',
        'Sensors': 'Optical Heart Rate, SpO2, Accelerometer',
        'Warranty': '1 Year Domestic Brand Warranty'
      },
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
      mrp: 7999,
      price: 2999,
      discountPercent: 62,
      rating: 4.5,
      reviewCount: 980,
      isFeatured: true,
      isTrending: true,
      sku: 'NOISE-CF5-MAX',
      stock: 32,
      lowStockThreshold: 5,
      status: 'ACTIVE',
      tags: ['smartwatch', 'amoled', 'calling', 'fitness', 'noise'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7,
      variants: [
        {
          id: 'v_strap',
          name: 'Strap Color',
          type: 'color',
          options: [
            { id: 'opt_jet_black', name: 'Jet Black Silicone', sku: 'NOISE-CF5-BLK', priceOffset: 0, stock: 18 },
            { id: 'opt_vintage_brown', name: 'Vintage Brown Leather', sku: 'NOISE-CF5-BRN', priceOffset: 300, stock: 14 }
          ]
        }
      ]
    },
    {
      _id: 'prd_fabindia_kurta',
      title: 'FabIndia Pure Chanderi Silk Embroidered Men\'s Kurta & Churidar Set',
      slug: 'fabindia-chanderi-silk-kurta-set',
      brand: 'FabIndia',
      category: 'Indian Ethnic & Modern Fashion',
      subcategory: 'Men Kurta & Sherwani',
      description: 'Handcrafted with pride in Madhya Pradesh, this regal Chanderi Silk kurta features fine Zari neck embroidery, Mandarin collar, and breathable mulmul lining. Perfect for weddings, Diwali, and festive gatherings.',
      features: [
        'Pure Handwoven Chanderi Silk Fabric with Cotton Mulmul Lining',
        'Intricate Golden Zari Embroidery on Placket & Cuffs',
        'Includes Matching Soft Off-White Cotton Churidar Pants',
        'Side Slits with Deep Utility Pockets',
        'Certified Authentic Handcrafted Indian Handloom'
      ],
      specifications: {
        'Fabric': 'Chanderi Silk & Cotton Mulmul',
        'Fit': 'Comfort Ethnic Regular Fit',
        'Length': 'Knee Length (42 inches)',
        'Care Instructions': 'Dry Clean Only',
        'Origin': 'Handcrafted in Chanderi, India'
      },
      images: [
        'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop&q=80',
      mrp: 6999,
      price: 3899,
      discountPercent: 44,
      rating: 4.8,
      reviewCount: 310,
      isFeatured: true,
      isBestSeller: true,
      sku: 'FAB-CHND-SET',
      stock: 22,
      lowStockThreshold: 4,
      status: 'ACTIVE',
      tags: ['fashion', 'ethnic', 'kurta', 'chanderi', 'diwali'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7,
      variants: [
        {
          id: 'v_size',
          name: 'Size',
          type: 'size',
          options: [
            { id: 'opt_s_38', name: '38 (S)', sku: 'FAB-KRT-38', priceOffset: 0, stock: 5 },
            { id: 'opt_m_40', name: '40 (M)', sku: 'FAB-KRT-40', priceOffset: 0, stock: 8 },
            { id: 'opt_l_42', name: '42 (L)', sku: 'FAB-KRT-42', priceOffset: 0, stock: 6 },
            { id: 'opt_xl_44', name: '44 (XL)', sku: 'FAB-KRT-44', priceOffset: 100, stock: 3 }
          ]
        },
        {
          id: 'v_color',
          name: 'Shade',
          type: 'color',
          options: [
            { id: 'opt_royal_maroon', name: 'Royal Crimson Maroon', sku: 'FAB-KRT-MRN', priceOffset: 0, stock: 12 },
            { id: 'opt_emerald_green', name: 'Deep Emerald Green', sku: 'FAB-KRT-GRN', priceOffset: 0, stock: 10 }
          ]
        }
      ]
    },
    {
      _id: 'prd_banarasi_saree',
      title: 'Handloom Katan Banarasi Silk Saree with Rich Kadwa Zari Pallu',
      slug: 'handloom-katan-banarasi-silk-saree',
      brand: 'FabIndia',
      category: 'Indian Ethnic & Modern Fashion',
      subcategory: 'Women Sarees & Kurtis',
      description: 'A masterpiece from Varanasi weavers, this 100% pure Katan Silk saree features traditional Kadwa floral motifs woven with real antique gold zari. Comes with Silk Mark certification and unstitched matching blouse piece.',
      features: [
        '100% Pure Katan Mulberry Silk with Silk Mark Tag',
        'Intricate Meenakari & Gold Zari Kadwa Brocade Work',
        'Includes 0.8m Running Blouse Piece',
        'Heavy Designer Traditional Indian Pallu',
        'Heirloom Quality for Weddings & Festive Receptions'
      ],
      specifications: {
        'Saree Length': '5.5 Meters + 0.8 Meter Blouse Piece',
        'Weave Type': 'Varanasi Traditional Handloom',
        'Zari Type': 'Tested Antique Gold Finished Zari',
        'Care': 'Gentle Dry Clean Only'
      },
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80',
      mrp: 14999,
      price: 7499,
      discountPercent: 50,
      rating: 4.9,
      reviewCount: 420,
      isFeatured: true,
      isNewArrival: true,
      sku: 'BAN-KAT-01',
      stock: 15,
      lowStockThreshold: 3,
      status: 'ACTIVE',
      tags: ['saree', 'banarasi', 'silk', 'handloom', 'wedding'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7
    },
    {
      _id: 'prd_prestige_triply',
      title: 'Prestige Deluxe Tri-Ply Stainless Steel Pressure Cooker 5 Litre Induction Base',
      slug: 'prestige-deluxe-triply-pressure-cooker-5l',
      brand: 'Prestige',
      category: 'Home & Kitchen',
      subcategory: 'Cookware & Appliances',
      description: 'Cook nutritious, faster Indian meals with Prestige Deluxe Tri-Ply. Inner surgical 304 food-grade stainless steel layer, middle encapsulated aluminium core for even heat distribution without hot spots, and outer induction-friendly steel.',
      features: [
        'Tri-Ply Construction: Fast heat distribution, saves 20% LPG/Electricity',
        'Food Grade SS 304 Interior: No chemical leaching or food discoloration',
        'Precision Pressure Weight Valve & Controlled Gasket Release System',
        'Compatible with Gas, Induction, Ceramic, and Halogen Cooktops',
        'Ergonomic Stay-Cool Bakelite Handles'
      ],
      specifications: {
        'Capacity': '5 Litres (Ideal for 4-7 family members)',
        'Base': 'Gas & Induction Compatible Tri-Ply Base',
        'Thickness': '2.5 mm Heavy Gauge',
        'Warranty': '10 Years Prestige Domestic Warranty',
        'Certification': 'ISI Certified'
      },
      images: [
        'https://images.unsplash.com/photo-1585695603586-538965004ec9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1585695603586-538965004ec9?w=500&auto=format&fit=crop&q=80',
      mrp: 4995,
      price: 3299,
      discountPercent: 34,
      rating: 4.7,
      reviewCount: 650,
      isFeatured: true,
      isBestSeller: true,
      sku: 'PRES-TRIP-5L',
      stock: 40,
      lowStockThreshold: 8,
      status: 'ACTIVE',
      tags: ['kitchen', 'pressure cooker', 'prestige', 'induction', 'triply'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7
    },
    {
      _id: 'prd_forest_kumkumadi',
      title: 'Forest Essentials Ayurvedic Kumkumadi Night Serum with Kashmiri Saffron (30ml)',
      slug: 'forest-essentials-kumkumadi-serum-30ml',
      brand: 'Forest Essentials',
      category: 'Ayurvedic Beauty & Wellness',
      subcategory: 'Kumkumadi & Face Oils',
      description: 'Formulated following ancient Ayurvedic Charaka Samhita texts, this miraculous night serum combines pure Kashmiri Saffron (Kumkuma), Padmaka, Sandalwood, and 26 precious herbs slow-infused in sesame oil. Restores youthful radiance overnight.',
      features: [
        '100% Authentic Classical Ayurvedic Kumkumadi Formulation',
        'Visibly brightens complexion and diminishes pigmentation & spots',
        'Deep nourishment with pure Cold-Pressed Sesame & Sweet Almond Oils',
        'Free from parabens, mineral oils, petrochemicals, and synthetic fragrance',
        'Dermatologically tested and certified cruelty-free'
      ],
      specifications: {
        'Volume': '30 ml Glass Dropper Bottle',
        'Key Ingredients': 'Kashmiri Kesar (Saffron), Chandan (Sandalwood), Manjistha, Liquorice',
        'Skin Type': 'All Skin Types',
        'Application': '3-4 drops nightly on cleansed face'
      },
      images: [
        'https://images.unsplash.com/photo-1608248597359-24706596101c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1608248597359-24706596101c?w=500&auto=format&fit=crop&q=80',
      mrp: 3495,
      price: 2699,
      discountPercent: 23,
      rating: 4.8,
      reviewCount: 520,
      isFeatured: true,
      isTrending: true,
      sku: 'FE-KUMK-30ML',
      stock: 18,
      lowStockThreshold: 5,
      status: 'ACTIVE',
      tags: ['ayurveda', 'serum', 'saffron', 'beauty', 'skincare'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7
    },
    {
      _id: 'prd_kashmiri_saffron',
      title: 'Kongposh Certified Grade A1 Kashmiri Mongra Kesar / Saffron (5 Grams)',
      slug: 'kashmiri-mongra-saffron-5g',
      brand: 'Tata',
      category: 'Spices, Dry Fruits & Sweets',
      subcategory: 'Kashmiri Saffron & Spices',
      description: 'Harvested by hand from the picturesque fields of Pampore, Kashmir. 100% pure, lab-tested Grade A1 Mongra Saffron stigmas with high crocin content for intense natural aroma, crimson coloring, and rich medicinal properties.',
      features: [
        'GI-Tagged Certified 100% Pure Kashmiri Mongra Saffron',
        'Zero broken filaments, pollen, or yellow stamen waste',
        'High Crocin (240+) & Safranal level for rich golden color and aroma',
        'Packaged in air-tight luxury acrylic container to lock freshness',
        'FSSAI approved and batch-tested'
      ],
      specifications: {
        'Weight': '5 Grams Net',
        'Grade': 'Grade A1 Highest Export Quality (Mongra)',
        'Shelf Life': '24 Months',
        'Storage': 'Store in a cool, dark, moisture-free environment'
      },
      images: [
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
      mrp: 2999,
      price: 1899,
      discountPercent: 37,
      rating: 4.9,
      reviewCount: 280,
      isFeatured: false,
      isBestSeller: true,
      sku: 'KESH-MGRA-5G',
      stock: 60,
      lowStockThreshold: 10,
      status: 'ACTIVE',
      tags: ['kesar', 'saffron', 'kashmir', 'spice', 'organic'],
      codAvailable: true,
      shippingCharges: 49,
      returnDays: 0 // Non-returnable grocery
    },
    {
      _id: 'prd_titan_edge',
      title: 'Titan Edge Ceramic Slimmest Quartz Analog Watch for Men with Sapphire Glass',
      slug: 'titan-edge-ceramic-slimmest-analog-watch',
      brand: 'Titan',
      category: 'Indian Ethnic & Modern Fashion',
      subcategory: 'Watches & Jewellery',
      description: 'One of the world\'s slimmest ceramic watches, crafted with engineering precision in India. Measuring an incredible 4.4mm thin with scratch-resistant sapphire crystal and high-tech ceramic link bracelet.',
      features: [
        'Slimmest Ceramic Timepiece: Only 4.4mm Case Thickness',
        'Scratch-Resistant Curved Sapphire Crystal Lens',
        'High-Tech Hypoallergenic Ceramic Case and Bracelet',
        'Precision Swiss-Jeweled Quartz Movement made by Titan India',
        'Push-Button Butterfly Clasp'
      ],
      specifications: {
        'Case Thickness': '4.4 mm',
        'Case Material': 'Ceramic & Titanium',
        'Dial Color': 'Anthracite Sunray Grey',
        'Water Resistance': '30 Meters (3 ATM)',
        'Warranty': '2 Years International Titan Warranty'
      },
      images: [
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500&auto=format&fit=crop&q=80',
      mrp: 29995,
      price: 21995,
      discountPercent: 27,
      rating: 4.9,
      reviewCount: 190,
      isFeatured: true,
      isNewArrival: true,
      sku: 'TITAN-EDGE-CER',
      stock: 12,
      lowStockThreshold: 2,
      status: 'ACTIVE',
      tags: ['watch', 'titan', 'luxury', 'ceramic', 'analog'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7
    },
    {
      _id: 'prd_oneplus_nord_buds',
      title: 'OnePlus Nord Buds 3 Pro Truly Wireless Earbuds with 49dB Hybrid ANC',
      slug: 'oneplus-nord-buds-3-pro',
      brand: 'OnePlus',
      category: 'Electronics & Gadgets',
      subcategory: 'Headphones & Audio',
      description: 'Immerse in deep bass and quiet clarity. Equipped with 12.4mm titanized diaphragm drivers, 49dB Hybrid Active Noise Cancellation, Ultra-wide frequency range, and Google Fast Pair.',
      features: [
        '49dB Smart Hybrid Active Noise Cancellation',
        '12.4mm Titanized Dynamic Drivers with BassWave 2.0',
        'Up to 44 Hours Battery Life with Fast Charge Support',
        'Crystal-clear calls with 3-Mic Call Noise Reduction',
        'Dual Device Connection seamlessly switching between Phone and Laptop'
      ],
      specifications: {
        'Playtime': 'Up to 44 Hours with charging case',
        'ANC Depth': '49dB Hybrid ANC',
        'Driver': '12.4mm Titanized Diaphragm',
        'Bluetooth': 'v5.4 with Low Latency Mode',
        'IP Rating': 'IP55 Dust and Water Resistance'
      },
      images: [
        'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=500&auto=format&fit=crop&q=80',
      mrp: 3999,
      price: 2799,
      discountPercent: 30,
      rating: 4.7,
      reviewCount: 780,
      isFeatured: true,
      isTrending: true,
      sku: '1PLUS-NORD-B3',
      stock: 50,
      lowStockThreshold: 10,
      status: 'ACTIVE',
      tags: ['oneplus', 'earbuds', 'anc', 'nord', 'audio'],
      codAvailable: true,
      shippingCharges: 0,
      returnDays: 7
    },
    {
      _id: 'prd_mamaearth_ubtan',
      title: 'Mamaearth Ubtan Natural Face Wash with Turmeric & Saffron for Tan Removal (150ml)',
      slug: 'mamaearth-ubtan-face-wash-150ml',
      brand: 'Mamaearth',
      category: 'Ayurvedic Beauty & Wellness',
      subcategory: 'Kumkumadi & Face Oils',
      description: 'Get that natural wedding glow every day. Infused with age-old Ayurvedic Ubtan recipe featuring Haldi, Chandan, Kesar, and walnut beads that gently exfoliate dead skin cells to reveal luminous Indian skin.',
      features: [
        'Traditional Ubtan formula with Haldi and Saffron',
        'Effectively clears stubborn sun-tan and pollution dullness',
        'Gentle walnut beads buff away dead skin without micro-tears',
        'Toxin-free: 0% Sulfates, Parabens, SLS, or Artificial Colors',
        'Made Safe Certified and Dermatologically Tested'
      ],
      specifications: {
        'Volume': '150 ml Tube',
        'Key Ingredients': 'Turmeric, Saffron, Walnut Beads, Carrot Seed Oil',
        'Skin Type': 'Suitable for All Skin Types',
        'Shelf Life': '24 Months'
      },
      images: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80'
      ],
      thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
      mrp: 399,
      price: 299,
      discountPercent: 25,
      rating: 4.5,
      reviewCount: 2100,
      isFeatured: false,
      isBestSeller: true,
      sku: 'MAMA-UBTAN-FW',
      stock: 120,
      lowStockThreshold: 20,
      status: 'ACTIVE',
      tags: ['mamaearth', 'ubtan', 'facewash', 'turmeric', 'skincare'],
      codAvailable: true,
      shippingCharges: 49,
      returnDays: 7
    }
  ];

  await productsCol.insertMany(products);

  // 6. Banners
  const banners: Banner[] = [
    {
      _id: 'ban_festive_01',
      title: 'Maha Bachat Utsav: Up to 75% Off',
      subtitle: 'Flat 10% Extra Cashback with UPI & Instant Bank Discounts. Free 2-Day Express Delivery across India!',
      ctaText: 'Explore Offers',
      ctaLink: '/products',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&auto=format&fit=crop&q=80',
      badge: 'LIMITED TIME FESTIVE DEALS',
      bgColor: 'from-orange-600 to-amber-700',
      order: 1,
      isActive: true,
    },
    {
      _id: 'ban_audio_02',
      title: 'Sound of Bharat: Audio Mega Fest',
      subtitle: 'Premium ANC Earbuds & Smartwatches starting at ₹999. Top Brands boAt, Noise & OnePlus.',
      ctaText: 'Shop Electronics',
      ctaLink: '/products?category=Electronics%20%26%20Gadgets',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&auto=format&fit=crop&q=80',
      badge: 'TOP ELECTRONICS PICKS',
      bgColor: 'from-blue-900 to-indigo-950',
      order: 2,
      isActive: true,
    },
    {
      _id: 'ban_ethnic_03',
      title: 'Authentic Indian Weaves & Kurtas',
      subtitle: 'Handpicked pure Chanderi Silk, Banarasi Katan, and Handcrafted Linen sets for festive grace.',
      ctaText: 'Discover Ethnic Wear',
      ctaLink: '/products?category=Indian%20Ethnic%20%26%20Modern%20Fashion',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&auto=format&fit=crop&q=80',
      badge: 'HERITAGE HANDLOOM',
      bgColor: 'from-red-900 to-rose-950',
      order: 3,
      isActive: true,
    }
  ];

  await bannersCol.insertMany(banners);

  // 7. Coupons
  const coupons: Coupon[] = [
    {
      _id: 'cpn_welcome100',
      code: 'WELCOME100',
      description: 'Flat ₹100 instant discount on your first order of ₹499 or more.',
      discountType: 'FIXED',
      discountValue: 100,
      minOrderAmount: 499,
      maxDiscountAmount: 100,
      startDate: new Date(Date.now() - 86400000 * 30).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 90).toISOString(),
      usageLimit: 10000,
      usedCount: 320,
      perUserLimit: 1,
      isActive: true,
    },
    {
      _id: 'cpn_bharat15',
      code: 'BHARAT15',
      description: '15% instant discount up to ₹500 on cart value above ₹999.',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minOrderAmount: 999,
      maxDiscountAmount: 500,
      startDate: new Date(Date.now() - 86400000 * 10).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 60).toISOString(),
      usageLimit: 5000,
      usedCount: 412,
      perUserLimit: 2,
      isActive: true,
    },
    {
      _id: 'cpn_festive500',
      code: 'FESTIVE500',
      description: 'Save ₹500 on big orders of ₹2,499 and above.',
      discountType: 'FIXED',
      discountValue: 500,
      minOrderAmount: 2499,
      maxDiscountAmount: 500,
      startDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 45).toISOString(),
      usageLimit: 2000,
      usedCount: 154,
      perUserLimit: 1,
      isActive: true,
    }
  ];

  await couponsCol.insertMany(coupons);

  // 8. Flash Sales
  const flashSale: FlashSale = {
    _id: 'fs_midnight_madness',
    title: 'Flash Deal Dhamaka',
    subtitle: 'Lightning deals with guaranteed lowest prices in India! Hurry, limited stock remaining.',
    discountPercent: 50,
    startTime: new Date(Date.now() - 3600000 * 6).toISOString(),
    endTime: new Date(Date.now() + 3600000 * 18).toISOString(), // 18 hours remaining
    productIds: ['prd_boat_nirvana', 'prd_noise_colorfit', 'prd_forest_kumkumadi'],
    bannerImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80',
    isActive: true,
  };

  await flashSalesCol.insertOne(flashSale);

  // 9. Verified Customer Reviews
  const reviews: Review[] = [
    {
      _id: 'rev_01',
      productId: 'prd_boat_nirvana',
      userId: 'usr_priya_02',
      userName: 'Priya Patel',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      rating: 5,
      title: 'Best ANC earbuds under ₹3,000 in India!',
      comment: 'The noise cancellation completely blocks Mumbai local train and traffic noise on my daily commute. Battery life is unbelievable – I have not charged the case in 2 weeks. Highly recommended!',
      verifiedPurchase: true,
      helpfulVotes: 48,
      status: 'APPROVED',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      _id: 'rev_02',
      productId: 'prd_boat_nirvana',
      userId: 'usr_rahul_01',
      userName: 'Rahul Sharma',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rating: 5,
      title: 'Amazing punchy bass and crystal clear calling',
      comment: 'Audio clarity is top notch for Hindi, Punjabi, and Western tunes. Quad mics work flawlessly on Google Meet calls even with ceiling fan on high speed.',
      verifiedPurchase: true,
      helpfulVotes: 32,
      status: 'APPROVED',
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
    {
      _id: 'rev_03',
      productId: 'prd_fabindia_kurta',
      userId: 'usr_priya_02',
      userName: 'Priya Patel',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      rating: 5,
      title: 'Gifted this to my brother for Diwali. Royal look!',
      comment: 'The Chanderi silk has a very subtle, graceful sheen without being overly loud. The inner cotton lining ensures zero itching. Fits true to size.',
      verifiedPurchase: true,
      helpfulVotes: 19,
      status: 'APPROVED',
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      _id: 'rev_04',
      productId: 'prd_prestige_triply',
      userId: 'usr_rahul_01',
      userName: 'Rahul Sharma',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      rating: 4,
      title: 'Solid heavy stainless steel build',
      comment: 'Dal and Biryani cook much faster compared to aluminium cookers, and cleaning is effortless. No burnt spots on the base.',
      verifiedPurchase: true,
      helpfulVotes: 15,
      status: 'APPROVED',
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    }
  ];

  await reviewsCol.insertMany(reviews);

  // 10. Sample Pre-Existing Orders for Rahul Sharma
  const sampleOrder: Order = {
    _id: 'ord_sample_984712',
    orderNumber: 'BK-2026-984712',
    userId: 'usr_rahul_01',
    customerName: 'Rahul Sharma',
    customerEmail: 'rahul.sharma@example.com',
    customerPhone: '+91 98765 43210',
    shippingAddress: defaultAddress,
    items: [
      {
        productId: 'prd_boat_nirvana',
        title: 'boAt Nirvana Ion ANC Noise Cancelling Earbuds',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80',
        sku: 'BOAT-NIRV-01',
        price: 2499,
        mrp: 9990,
        quantity: 1,
        variantDetails: 'Color: Charcoal Black'
      }
    ],
    subtotal: 2499,
    discount: 0,
    couponCode: 'WELCOME100',
    couponDiscount: 100,
    shippingCharge: 0,
    taxAmount: 431.82, // 18% included GST
    totalAmount: 2399,
    paymentMethod: 'UPI_QR',
    paymentStatus: 'PAID',
    paymentId: 'pay_upi_bharat_98231',
    orderStatus: 'OUT_FOR_DELIVERY',
    estimatedDeliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    courierPartner: 'BlueDart Express India',
    trackingNumber: 'BD-IN-9812457812',
    invoiceNumber: 'INV-BK-2026-0041',
    timeline: [
      {
        status: 'CONFIRMED',
        title: 'Order Confirmed & Payment Verified',
        description: 'Payment of ₹2,399 verified via UPI (GPay/PhonePe). Order passed to warehouse.',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        completed: true,
      },
      {
        status: 'PACKED',
        title: 'Packed & Quality Checked',
        description: 'Item carefully inspected and sealed in BharatKart tamper-evident packaging at Bhiwandi Fulfillment Center.',
        timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        completed: true,
      },
      {
        status: 'SHIPPED',
        title: 'Shipped with BlueDart Express',
        description: 'Dispatched via Air Express. Waybill tracking #BD-IN-9812457812 assigned.',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        location: 'Mumbai Hub Sort Facility',
        completed: true,
      },
      {
        status: 'OUT_FOR_DELIVERY',
        title: 'Out for Delivery',
        description: 'BlueDart delivery executive (Santosh K. +91 98332 11223) is on the way with your package.',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        location: 'Fort Delivery Hub, Mumbai',
        completed: true,
      },
      {
        status: 'DELIVERED',
        title: 'Expected Delivery',
        description: 'Arriving today before 6:00 PM.',
        timestamp: new Date(Date.now() + 3600000 * 4).toISOString(),
        completed: false,
      }
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  };

  await ordersCol.insertOne(sampleOrder);

  // 11. Audit Log Initial
  await auditLogsCol.insertOne({
    _id: 'log_seed_init',
    userId: 'usr_super_01',
    userName: 'Vikramaditya Rao',
    action: 'SYSTEM_BOOTSTRAP',
    entity: 'PLATFORM',
    entityId: 'bharatkart_core',
    details: 'BharatKart initial product catalog, Indian payment gateway config, and inventory seeded successfully.',
    ipAddress: '127.0.0.1',
    createdAt: new Date().toISOString(),
  });

  console.log('BharatKart database seeded with 100% realistic Indian e-commerce data!');
}
