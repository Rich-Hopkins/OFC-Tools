import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ofcLogo from '../assets/ofc-log-no-text.svg';

export function HomePage() {
  useEffect(() => {
    document.title = 'OFC Tools';
  }, []);

  return (
    <main className="shell shell-home">
      <section className="hero hero-home">
        <div className="hero-brand">
          <img className="hero-logo" src={ofcLogo} alt="OFC Tools" />
          <div>
            <p className="eyebrow">OFC Tools</p>
            <h1>Simple tools for the event team</h1>
          </div>
        </div>
      </section>

      <section className="home-card-grid" aria-label="Available tools">
        <article className="home-card">
          <p className="eyebrow">Bike-a-Thon</p>
          <h2>Lap tracker</h2>
          <p>Track riders, count laps, and keep everything saved locally on this device.</p>
          <Link className="secondary-button link-button" to="/bike-a-thon">
            Go to tracker
          </Link>
        </article>
        <article className="home-card">
          <p className="eyebrow">Giving</p>
          <h2>Drawer counter</h2>
          <p>Count the drawer at the end of an event with two independent counters to verify totals.</p>
          <Link className="secondary-button link-button" to="/drawer-count">
            Go to counter
          </Link>
        </article>
      </section>
    </main>
  );
}
