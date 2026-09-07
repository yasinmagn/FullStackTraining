import { NavLink, Outlet, useNavigation } from 'react-router-dom';

/**
 * A LAYOUT route: chrome that stays put while the content underneath changes.
 *
 * `<Outlet />` is the hole the matched child route renders into. Nesting
 * layouts this way is what stops you re-rendering (and re-mounting) the header
 * and nav on every navigation - which is also why scroll position and focus
 * survive.
 */
export function RootLayout() {
  /*
   * `useNavigation` reports a navigation in progress. Useful for a top-of-page
   * loading bar - the equivalent of the browser's own spinner, which a
   * client-side router replaces and must therefore replace properly.
   */
  const navigation = useNavigation();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Task Board</h1>
        <p className="tagline">Stage 7 &middot; routing and testing</p>
      </header>

      <nav className="segmented" aria-label="Main">
        {/*
          <NavLink> knows whether it is the active route, so you do not
          reimplement "am I selected" with useLocation.

          `end` means "match this path exactly" - without it, "/" would be
          considered active on every page, since every path starts with "/".
        */}
        <NavLink to="/" end className="nav-link">
          {({ isActive }) => <span aria-current={isActive ? 'page' : undefined}>Tasks</span>}
        </NavLink>
        <NavLink to="/about" className="nav-link">
          {({ isActive }) => <span aria-current={isActive ? 'page' : undefined}>About</span>}
        </NavLink>
      </nav>

      {navigation.state === 'loading' && (
        <p className="lab-note" role="status">
          Loading...
        </p>
      )}

      {/* The matched child route renders here. */}
      <Outlet />
    </div>
  );
}
