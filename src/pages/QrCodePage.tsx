import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ofcLogo from '../assets/ofc-log-no-text.svg';
import qrCode from '../assets/qr-code.svg';

export function QrCodePage() {
  useEffect(() => {
    document.title = 'OFC Tools | Share this app';
  }, []);

  return (
    <main className="shell shell-home">
      <section className="hero hero-home qr-hero">
        <div className="hero-brand">
          <Link className="hero-logo-link" to="/" aria-label="Go to OFC Tools home">
            <img className="hero-logo" src={ofcLogo} alt="OFC Tools" />
          </Link>
          <div>
            <p className="eyebrow">OFC Tools</p>
            <h1>Share this app</h1>
          </div>
        </div>

        <p className="intro">Scan this code to open OFC Tools on another device.</p>
      </section>

      <section className="qr-page-card" aria-label="QR code">
        <img className="qr-code-image" src={qrCode} alt="QR code for OFC Tools" />
        <Link className="secondary-button link-button qr-back-link" to="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
