import { Link } from "react-router-dom";

// ==========================================
// LandingPage — Halaman utama dengan desain premium
// ==========================================
export default function LandingPage() {
  return (
    <div className="flex flex-col gap-12 pb-12 overflow-x-hidden">
      {/* Hero Section */}
      <section className="flex flex-col-reverse md:flex-row items-center justify-between gap-8 min-h-[70vh] py-8 relative">
        <div className="flex-1 flex flex-col items-start gap-4 animate-fade-in-up">
          <span className="bg-secondary text-primary-dark px-3 py-1 rounded-full text-sm font-semibold inline-block mb-2">✨ Homemade dengan Cinta</span>
          <h1 className="text-4xl md:text-5xl leading-tight text-text font-bold m-0">
            Rasakan Manisnya <span className="text-primary relative inline-block">Momen Anda</span>
          </h1>
          <p className="text-lg text-text-light max-w-lg leading-relaxed">
            Kue kering premium yang dipanggang segar sesuai pesanan. Dibuat dengan bahan berkualitas tinggi untuk menghadirkan kebahagiaan di setiap gigitannya.
          </p>
          <div className="flex gap-4 mt-6">
            <Link to="/products" className="btn btn-primary">Pesan Sekarang</Link>
            <a href="#features" className="btn btn-secondary">Pelajari Lebih Lanjut</a>
          </div>
        </div>
        <div className="flex-1 relative flex justify-center items-center">
          {/* Glassmorphism card for a floating effect */}
          <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl p-8 flex flex-col items-center text-center gap-2 shadow-xl max-w-xs animate-float">
            <div className="text-7xl mb-2">🍪</div>
            <div className="text-xl text-text font-bold m-0">
              <h4>Choco Chunk Premium</h4>
              <p className="text-primary font-semibold text-base mt-1">Best Seller Minggu Ini!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8">
        <div className="bg-white rounded-2xl p-8 shadow-md text-center transition-transform duration-300 border border-border hover:-translate-y-2 hover:shadow-xl">
          <div className="text-5xl mb-4 bg-secondary w-20 h-20 inline-flex items-center justify-center rounded-full">🌿</div>
          <h3 className="text-primary-dark font-bold mb-2 text-xl">Bahan Premium</h3>
          <p className="text-text-light">Kami hanya menggunakan mentega asli, coklat Belgia, dan bahan pilihan terbaik.</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-md text-center transition-transform duration-300 border border-border hover:-translate-y-2 hover:shadow-xl">
          <div className="text-5xl mb-4 bg-secondary w-20 h-20 inline-flex items-center justify-center rounded-full">👩‍🍳</div>
          <h3 className="text-primary-dark font-bold mb-2 text-xl">Dibuat Fresh</h3>
          <p className="text-text-light">Setiap pesanan dipanggang di hari yang sama untuk menjamin kesegaran.</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-md text-center transition-transform duration-300 border border-border hover:-translate-y-2 hover:shadow-xl">
          <div className="text-5xl mb-4 bg-secondary w-20 h-20 inline-flex items-center justify-center rounded-full">🎁</div>
          <h3 className="text-primary-dark font-bold mb-2 text-xl">Packaging Eksklusif</h3>
          <p className="text-text-light">Dikemas dengan cantik, sangat cocok untuk dinikmati sendiri atau sebagai hadiah.</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary-light to-primary-dark rounded-2xl p-12 text-center text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold m-0">Siap Untuk Mencoba?</h2>
          <p className="text-lg opacity-90 m-0">Bergabunglah dengan ratusan pelanggan setia kami yang telah merasakan kelezatannya.</p>
          <Link to="/products" className="bg-white text-primary-dark hover:bg-secondary shadow-md px-8 py-4 rounded-full font-semibold transition-all duration-300 inline-block text-lg mt-4">Lihat Katalog Kami</Link>
        </div>
      </section>
    </div>
  );
}
