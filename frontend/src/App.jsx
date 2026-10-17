import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CatalogPage from './pages/CatalogPage';
import DetailPage from './pages/DetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        {/* Navbar Header Elevenplay */}
        <Navbar />

        {/* Konten Halaman */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/katalog/:code" element={<DetailPage />} />
          </Routes>
        </main>

        {/* Footer Resmi Elevenplay */}
        <Footer />
      </div>
    </BrowserRouter>
  );
}
