import { Outlet } from "react-router-dom";

// ==========================================
// MainLayout — Layout utama untuk halaman customer
// Terdiri dari: Navbar, konten halaman (Outlet), dan Footer.
// ==========================================
export default function MainLayout() {
  return (
    <div className="main-layout">
      {/* TODO: Navbar component */}
      <header className="navbar">
        <nav>
          <a href="/" className="logo">🍪 Utique</a>
          <div className="nav-links">
            <a href="/products">Katalog</a>
            <a href="/cart">Keranjang</a>
            <a href="/orders">Pesanan</a>
            <a href="/profile">Profil</a>
          </div>
        </nav>
      </header>

      {/* Konten halaman */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* TODO: Footer component */}
      <footer className="footer">
        <p>&copy; 2026 Utique. All rights reserved.</p>
      </footer>
    </div>
  );
}
