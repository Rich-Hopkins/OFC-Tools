import { Link } from 'react-router-dom';

type InstallFooterProps = {
  onInstall: () => void;
  canInstall: boolean;
  isInstalled: boolean;
};

export function InstallFooter({ onInstall, canInstall, isInstalled }: InstallFooterProps) {
  if (isInstalled) return null;

  return (
    <footer className="install-footer" aria-label="Install app">
      <Link className="install-link install-share-link" to="/qr-code">
        Share this app
      </Link>
      <button
        type="button"
        className="install-link"
        onClick={() => {
          if (canInstall) {
            onInstall();
            return;
          }
          window.alert('Install this app from your browser menu when the browser makes it available.');
        }}
      >
        Install app
      </button>
    </footer>
  );
}
