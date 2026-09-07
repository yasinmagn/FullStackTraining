// app/layout.jsx is the ROOT LAYOUT — a special Next.js file that wraps EVERY
// page in the app. It defines the <html>/<body> shell and anything that should
// appear on all pages. This is a Server Component by default (no "use client").
import "./globals.css";
import { CartProvider } from "../components/CartContext";
import { AuthProvider } from "../components/AuthContext";
import AppShell from "../components/AppShell";

// Next.js reads this "metadata" export to set the page <title> and description
// in the browser tab and for SEO.
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
        {/* Wrapping the whole app in these Providers makes the logged-in user
            (AuthProvider) and the shopping cart (CartProvider) available to
            EVERY component below — no need to pass them down as props
            ("prop-drilling"). Any component can just call useAuth()/useCart().
            {children} is whatever page is currently being shown. */}
        <AuthProvider>
          <CartProvider>
            <AppShell>{children}</AppShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
