import { Outlet, Navigate, Link } from "react-router-dom";
import useAuthStore from "../stores/use-auth-store";

/**
 * AdminLayout — Layout untuk halaman admin
 * Dilindungi oleh role check — hanya user dengan role ADMIN yang bisa akses.
 * Terdiri dari: Sidebar navigasi dan konten halaman (Outlet).
 */
export default function AdminLayout() {
  const { user, isLoading } = useAuthStore();

  // Tampilkan loading state saat auth check sedang berlangsung
  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  // Redirect ke login jika user belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect ke home jika bukan admin
  if (user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar navigasi admin */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Link to="/admin">🍪 Utique Admin</Link>
        </div>
        <nav className="admin-nav">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/products">Produk</Link>
          <Link to="/admin/orders">Pesanan</Link>
        </nav>
        <div className="admin-footer">
          <Link to="/">← Kembali ke Toko</Link>
        </div>
      </aside>

      {/* Konten halaman admin */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
