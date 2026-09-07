export function AboutPage() {
  return (
    <section className="card">
      <header className="card-header">
        <h2>About</h2>
      </header>
      <div className="card-body">
        <p>
          A second route, so the nav has somewhere to go and the layout has something to swap in and
          out of its <code>&lt;Outlet /&gt;</code>.
        </p>
      </div>
    </section>
  );
}
