import React, { useState, useEffect } from 'react';
import {
  Filter,
  SlidersHorizontal,
  Star,
  X,
  ChevronDown,
  Search,
  Check,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { Product, Category, Brand } from '../types.js';
import { ProductCard } from '../components/ProductCard.js';
import { SEOHead } from '../components/SEOHead.js';

interface CatalogPageProps {
  initialQuery?: string;
  initialCategory?: string;
  initialFeatured?: string;
  initialBestSeller?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialQuery = '',
  initialCategory = '',
  initialFeatured,
  initialBestSeller,
  onNavigate,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Available metadata for filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Filter States
  const [search, setSearch] = useState<string>(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [codOnly, setCodOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<string>('popularity');

  // Mobile filter drawer toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Load filter metadata
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch('/api/products/meta/categories'),
          fetch('/api/products/meta/brands'),
        ]);
        const catJson = await catRes.json();
        const brandJson = await brandRes.json();
        if (catJson.success) setCategories(catJson.data);
        if (brandJson.success) setBrands(brandJson.data);
      } catch (e) {
        console.error('Failed to load filter metadata:', e);
      }
    };
    fetchMeta();
  }, []);

  // Update from props if changed
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
    if (initialQuery) setSearch(initialQuery);
  }, [initialCategory, initialQuery]);

  // Fetch products based on active filters
  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (minPrice !== '') params.append('minPrice', minPrice.toString());
      if (maxPrice !== '') params.append('maxPrice', maxPrice.toString());
      if (minRating > 0) params.append('minRating', minRating.toString());
      if (inStockOnly) params.append('inStock', 'true');
      if (codOnly) params.append('codOnly', 'true');
      if (initialFeatured) params.append('isFeatured', 'true');
      if (initialBestSeller) params.append('isBestSeller', 'true');
      if (sort) params.append('sort', sort);
      params.append('page', page.toString());
      params.append('limit', '12');

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
        setTotal(json.total || 0);
        setPages(json.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredProducts();
  }, [
    search,
    selectedCategory,
    selectedBrand,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    codOnly,
    sort,
    page,
    initialFeatured,
    initialBestSeller,
  ]);

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedBrand('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setInStockOnly(false);
    setCodOnly(false);
    setSort('popularity');
    setPage(1);
  };

  const hasActiveFilters =
    search || selectedCategory || selectedBrand || minPrice !== '' || maxPrice !== '' || minRating > 0 || inStockOnly || codOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SEOHead
        title={selectedCategory ? `${selectedCategory} Online Store | BharatKart` : 'Explore Indian Catalog | BharatKart'}
        description={`Browse ${total} top-rated Indian products with fast doorstep delivery, instant UPI cashback, and cash on delivery.`}
      />

      {/* Top Bar: Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs text-slate-500 mb-1">
            <span className="cursor-pointer hover:text-orange-600" onClick={() => onNavigate('home')}>Home</span>
            <span className="mx-1.5">&gt;</span>
            <span className="font-semibold text-slate-800">
              {selectedCategory || (search ? `Search: "${search}"` : 'All Products')}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {selectedCategory || (search ? `Search Results for "${search}"` : 'All Products & Collections')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing <span className="font-bold text-slate-800">{total}</span> items found
          </p>
        </div>

        {/* Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-orange-600" />
            <span>Filters {hasActiveFilters && '(Active)'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort by:</span>
            <select
              value={sort}
              onChange={e => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="popularity">Popularity & Best Match</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Customer Rating</option>
              <option value="discount">Biggest Discounts</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Filters Sidebar + Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6 sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-bold text-slate-900">Filters</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Categories Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">Category</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setPage(1);
                }}
                className={`w-full text-left text-xs py-1 px-2 rounded-lg transition-colors flex items-center justify-between ${
                  !selectedCategory ? 'bg-orange-50 text-orange-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>All Categories</span>
                {!selectedCategory && <Check className="w-3.5 h-3.5 text-orange-600" />}
              </button>
              {categories.map(cat => (
                <button
                  key={cat._id}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setPage(1);
                  }}
                  className={`w-full text-left text-xs py-1 px-2 rounded-lg transition-colors flex items-center justify-between ${
                    selectedCategory === cat.name
                      ? 'bg-orange-50 text-orange-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {selectedCategory === cat.name && <Check className="w-3.5 h-3.5 text-orange-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Brands Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">Brand</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              <button
                onClick={() => {
                  setSelectedBrand('');
                  setPage(1);
                }}
                className={`w-full text-left text-xs py-1 px-2 rounded-lg transition-colors flex items-center justify-between ${
                  !selectedBrand ? 'bg-orange-50 text-orange-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>All Brands</span>
              </button>
              {brands.map(b => (
                <button
                  key={b._id}
                  onClick={() => {
                    setSelectedBrand(b.name);
                    setPage(1);
                  }}
                  className={`w-full text-left text-xs py-1 px-2 rounded-lg transition-colors flex items-center justify-between ${
                    selectedBrand === b.name ? 'bg-orange-50 text-orange-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{b.name}</span>
                  {selectedBrand === b.name && <Check className="w-3.5 h-3.5 text-orange-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">Price (₹)</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={e => {
                  setMinPrice(e.target.value === '' ? '' : Number(e.target.value));
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={e => {
                  setMaxPrice(e.target.value === '' ? '' : Number(e.target.value));
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">Customer Rating</h4>
            <div className="space-y-1.5">
              {[4, 3, 2].map(r => (
                <button
                  key={r}
                  onClick={() => {
                    setMinRating(minRating === r ? 0 : r);
                    setPage(1);
                  }}
                  className={`w-full text-left text-xs py-1.5 px-2 rounded-lg flex items-center justify-between transition-colors ${
                    minRating === r ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-500">
                      {[...Array(r)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                    <span>& Above</span>
                  </div>
                  {minRating === r && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Availability & Delivery toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={e => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-orange-600 focus:ring-orange-500"
              />
              <span>In Stock Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={codOnly}
                onChange={e => {
                  setCodOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-orange-600 focus:ring-orange-500"
              />
              <span>Cash on Delivery Available</span>
            </label>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3 space-y-6">
          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Active Filters:</span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg font-medium">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('')}><X className="w-3 h-3 text-slate-400 hover:text-slate-700" /></button>
                </span>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg font-medium">
                  Brand: {selectedBrand}
                  <button onClick={() => setSelectedBrand('')}><X className="w-3 h-3 text-slate-400 hover:text-slate-700" /></button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg font-medium">
                  Keyword: "{search}"
                  <button onClick={() => setSearch('')}><X className="w-3 h-3 text-slate-400 hover:text-slate-700" /></button>
                </span>
              )}
              {minRating > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg font-medium">
                  {minRating}★ & Above
                  <button onClick={() => setMinRating(0)}><X className="w-3 h-3 text-slate-400 hover:text-slate-700" /></button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg font-medium">
                  In Stock
                  <button onClick={() => setInStockOnly(false)}><X className="w-3 h-3 text-slate-400 hover:text-slate-700" /></button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-rose-600 font-bold hover:underline ml-auto"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-3">
                  <div className="aspect-square bg-slate-100 rounded-xl"></div>
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                {products.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onSelectProduct={slug => onNavigate('product-detail', { slug })}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {[...Array(pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                        page === i + 1
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                🔍
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No products match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Try loosening your filters, checking different categories, or removing specific search terms.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xs h-full p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Filters</h3>
              <button onClick={() => setIsMobileFilterOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">Category</h4>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat._id}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setIsMobileFilterOpen(false);
                    }}
                    className="w-full text-left text-xs py-1.5 px-2 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold text-center"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
