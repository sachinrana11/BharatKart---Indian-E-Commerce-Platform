import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext.js';
import { AuthProvider } from './context/AuthContext.js';
import { PincodeProvider } from './context/PincodeContext.js';
import { CartProvider } from './context/CartContext.js';
import { WishlistProvider } from './context/WishlistContext.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { PincodeModal } from './components/PincodeModal.js';
import { CustomerSupportWidget } from './components/CustomerSupportWidget.js';

// Pages
import { HomePage } from './pages/HomePage.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { ProductDetailPage } from './pages/ProductDetailPage.js';
import { CartPage } from './pages/CartPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage.js';
import { OrdersPage } from './pages/OrdersPage.js';
import { OrderDetailPage } from './pages/OrderDetailPage.js';
import { WishlistPage } from './pages/WishlistPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';

interface NavigationState {
  view: string;
  params: Record<string, any>;
}

export function AppContent() {
  const [nav, setNav] = useState<NavigationState>({
    view: 'home',
    params: {},
  });

  const handleNavigate = (view: string, params: Record<string, any> = {}) => {
    setNav({ view, params });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    switch (nav.view) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;

      case 'catalog':
        return (
          <CatalogPage
            initialQuery={nav.params.q || ''}
            initialCategory={nav.params.category || ''}
            initialFeatured={nav.params.isFeatured}
            initialBestSeller={nav.params.isBestSeller}
            onNavigate={handleNavigate}
          />
        );

      case 'product-detail':
        return (
          <ProductDetailPage
            slug={nav.params.slug || ''}
            onNavigate={handleNavigate}
          />
        );

      case 'cart':
        return <CartPage onNavigate={handleNavigate} />;

      case 'checkout':
        return <CheckoutPage onNavigate={handleNavigate} />;

      case 'order-success':
        return (
          <PaymentSuccessPage
            orderId={nav.params.orderId}
            orderNumber={nav.params.orderNumber}
            onNavigate={handleNavigate}
          />
        );

      case 'orders':
        return <OrdersPage onNavigate={handleNavigate} />;

      case 'order-detail':
        return (
          <OrderDetailPage
            orderId={nav.params.id}
            onNavigate={handleNavigate}
          />
        );

      case 'wishlist':
        return <WishlistPage onNavigate={handleNavigate} />;

      case 'profile':
        return <ProfilePage onNavigate={handleNavigate} />;

      case 'admin':
        return <AdminDashboardPage onNavigate={handleNavigate} />;

      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      <Header currentView={nav.view} onNavigate={handleNavigate} />
      <main className="flex-1">
        {renderView()}
      </main>
      <Footer onNavigate={handleNavigate} />
      <PincodeModal />
      <CustomerSupportWidget onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <PincodeProvider>
          <CartProvider>
            <WishlistProvider>
              <AppContent />
            </WishlistProvider>
          </CartProvider>
        </PincodeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
