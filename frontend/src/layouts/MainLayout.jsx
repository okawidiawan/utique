import { Outlet, Link } from "react-router-dom";

/**
 * MainLayout — Layout utama untuk halaman customer
 * Terdiri dari: Navbar, konten halaman (Outlet), dan Footer.
 */
export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar component */}
      <header className="bg-white border-b border-border py-4 px-8 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <Link to="/" className="text-xl font-bold text-primary-dark">🍪 Utique</Link>
          <div className="flex gap-6">
            <Link to="/products" className="text-text font-medium transition-colors hover:text-primary">Katalog</Link>
            <Link to="/cart" className="text-text font-medium transition-colors hover:text-primary">Keranjang</Link>
            <Link to="/orders" className="text-text font-medium transition-colors hover:text-primary">Pesanan</Link>
            <Link to="/profile" className="text-text font-medium transition-colors hover:text-primary">Profil</Link>
          </div>
        </nav>
      </header>

      {/* Konten halaman */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-8">
        <Outlet />
      </main>

      {/* Footer component */}
      <footer className="bg-primary-dark text-white text-center p-6 mt-auto">
        <p>&copy; 2026 Utique. All rights reserved.</p>
      </footer>
    </div>
  );
}
