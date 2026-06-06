import { Outlet, Link } from "react-router-dom";

/**
 * MainLayout — Layout utama untuk halaman customer
 * Terdiri dari: Navbar, konten halaman (Outlet), dan Footer.
 */
export default function MainLayout() {
  return (
    <div className="main-layout">
      {/* Navbar component */}
      <header className="navbar">
        <nav>
          <Link to="/" className="logo">🍪 Utique</Link>
          <div className="nav-links">
            <Link to="/products">Katalog</Link>
            <Link to="/cart">Keranjang</Link>
            <Link to="/orders">Pesanan</Link>
            <Link to="/profile">Profil</Link>
          </div>
        </nav>
      </header>

      {/* Konten halaman */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Footer component */}
      <footer className="footer">
        <p>&copy; 2026 Utique. All rights reserved.</p>
      </footer>
    </div>
  );
}
