// The root layout wraps EVERY page in the app (Next.js App Router). It renders the
// <html>/<body> shell once and puts shared "providers" around all pages so any
// component can read auth and cart state. This is a Server Component by default
// (no "use client"), which is fine because the providers themselves are client ones.
import "./globals.css";
import { CartProvider } from "../components/CartContext";
import { AuthProvider } from "../components/AuthContext";
import AppShell from "../components/AppShell";

// Next.js reads this to set the page <title> and <meta description> tags.
export const metadata = {
  title: "SooqOnline — Somaliland's online market",
  description: "Phones, computers, audio and accessories, delivered across Somaliland.",
};

// `children` is whichever page/route is currently being shown.
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
        {/* Providers wrap the whole app so useAuth()/useCart() work anywhere below. */}
        {/* AppShell then chooses the storefront layout vs. the admin layout. */}
        <AuthProvider>
          <CartProvider>
            <AppShell>{children}</AppShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
