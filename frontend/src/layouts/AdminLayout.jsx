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
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
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
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar navigasi admin */}
      <aside className="w-64 bg-bg-dark text-white p-6 flex flex-col fixed inset-y-0 left-0">
        <div className="mb-12">
          <Link to="/admin" className="text-xl font-bold text-accent">🍪 Utique Admin</Link>
        </div>
        <nav className="flex flex-col gap-2">
          <Link to="/admin" className="text-white px-4 py-2 rounded-md transition-colors hover:bg-white/10 hover:text-accent">Dashboard</Link>
          <Link to="/admin/products" className="text-white px-4 py-2 rounded-md transition-colors hover:bg-white/10 hover:text-accent">Produk</Link>
          <Link to="/admin/orders" className="text-white px-4 py-2 rounded-md transition-colors hover:bg-white/10 hover:text-accent">Pesanan</Link>
        </nav>
        <div className="mt-auto">
          <Link to="/" className="text-text-light text-sm hover:text-white transition-colors">← Kembali ke Toko</Link>
        </div>
      </aside>

      {/* Konten halaman admin */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
