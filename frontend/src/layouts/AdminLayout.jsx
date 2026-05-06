import { Outlet, Navigate } from "react-router-dom";
import useAuthStore from "../stores/use-auth-store";

// ==========================================
// AdminLayout — Layout untuk halaman admin
// Dilindungi oleh role check — hanya user dengan role ADMIN yang bisa akses.
// Terdiri dari: Sidebar navigasi dan konten halaman (Outlet).
// ==========================================
export default function AdminLayout() {
  const { user } = useAuthStore();

  // Redirect ke home jika bukan admin
  if (user && user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar navigasi admin */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <a href="/admin">🍪 Utique Admin</a>
        </div>
        <nav className="admin-nav">
          <a href="/admin">Dashboard</a>
          <a href="/admin/products">Produk</a>
          <a href="/admin/orders">Pesanan</a>
        </nav>
        <div className="admin-footer">
          <a href="/">← Kembali ke Toko</a>
        </div>
      </aside>

      {/* Konten halaman admin */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
