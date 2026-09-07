import "./globals.css";
import { CartProvider } from "../components/CartContext";
import { AuthProvider } from "../components/AuthContext";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "SooqOnline — Somaliland's online market",
  description: "Phones, computers, audio and accessories, delivered across Somaliland.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-sand text-ink font-sans min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <CartProvider>
            <AppShell>{children}</AppShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
