import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { InstallFooter } from './components/InstallFooter';
import { BikeAThonPage } from './pages/BikeAThonPage';
import { HomePage } from './pages/HomePage';
import { QrCodePage } from './pages/QrCodePage';
import type { BeforeInstallPromptEvent } from './types';

function App() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bike-a-thon" element={<BikeAThonPage />} />
        <Route path="/qr-code" element={<QrCodePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallFooter onInstall={installApp} canInstall={Boolean(installPrompt)} isInstalled={isInstalled} />
    </HashRouter>
  );
}

export default App;