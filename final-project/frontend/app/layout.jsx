import "./globals.css";
import { CartProvider } from "../components/CartContext";
import { AuthProvider } from "../components/AuthContext";
import Navbar from "../components/Navbar";

export const metadata = { title: "SooqOnline", description: "Shop online in Somaliland" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="max-w-5xl w-full mx-auto p-6 flex-1">{children}</main>
            <footer className="text-center text-sm text-gray-500 py-6">
              © 2026 SooqOnline · Hargeisa, Somaliland
            </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
