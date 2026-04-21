import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ofcLogo from './assets/ofc-log-no-text.svg';

type Rider = {
  id: string;
  name: string;
  count: number;
  draft: boolean;
};

type SortMode = 'alpha' | 'desc' | 'asc';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const STORAGE_KEY = 'bike-a-thon-riders';
const SORT_MODE_KEY = 'bike-a-thon-sort-mode';
const MENU_WIDTH = 192;
const MENU_HEIGHT = 104;

type OpenMenu = {
  kind: 'rider' | 'footer';
  id?: string;
  top: number;
  left: number;
};

function readRiders(): Rider[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<Rider>[];
    return parsed
      .filter((rider): rider is Rider => Boolean(rider && typeof rider.id === 'string'))
      .map((rider) => ({
        id: rider.id,
        name: typeof rider.name === 'string' ? rider.name : '',
        count: typeof rider.count === 'number' ? rider.count : 0,
        draft: Boolean(rider.draft),
      }));
  } catch {
    return [];
  }
}

function readSortMode(): SortMode {
  try {
    const raw = window.localStorage.getItem(SORT_MODE_KEY);
    return raw === 'desc' || raw === 'asc' ? raw : 'alpha';
  } catch {
    return 'alpha';
  }
}

function makeRider(draft = false): Rider {
  return {
    id: crypto.randomUUID(),
    name: '',
    count: 0,
    draft,
  };
}

function sortVisibleRiders(riders: Rider[], sortMode: SortMode): Rider[] {
  const drafts = riders.filter((rider) => rider.draft);
  const committed = riders
    .filter((rider) => !rider.draft)
    .slice()
    .sort((left, right) => {
      if (sortMode === 'desc' && right.count !== left.count) {
        return right.count - left.count;
      }

      if (sortMode === 'asc' && right.count !== left.count) {
        return left.count - right.count;
      }

      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });

  return [...committed, ...drafts];
}

function App() {
  const [riders, setRiders] = useState<Rider[]>(() => {
    const savedRiders = readRiders();
    return savedRiders.length > 0 ? savedRiders : [makeRider(true)];
  });
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
  const floatingMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(riders));
  }, [riders]);

  useEffect(() => {
    window.localStorage.setItem(SORT_MODE_KEY, sortMode);
  }, [sortMode]);

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

  useEffect(() => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker?.register('/sw.js').catch(() => {
        // Offline support is best-effort in production.
      });
      return;
    }

    navigator.serviceWorker?.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          void caches.delete(key);
        });
      });
    }
  }, []);

  useLayoutEffect(() => {
    const menuElement = floatingMenuRef.current;
    if (!menuElement || !openMenu) {
      return;
    }

    menuElement.style.top = `${openMenu.top}px`;
    menuElement.style.left = `${openMenu.left}px`;
  }, [openMenu]);

  const visibleRiders = useMemo(() => sortVisibleRiders(riders, sortMode), [riders, sortMode]);

  function updateRider(id: string, updater: (current: Rider) => Rider) {
    setRiders((currentRiders) => currentRiders.map((rider) => (rider.id === id ? updater(rider) : rider)));
  }

  function addRider() {
    setRiders((currentRiders) => [...currentRiders, makeRider(true)]);
  }

  function closeMenu() {
    setOpenMenu(null);
  }

  function openMenuFromButton(kind: 'rider' | 'footer', id: string | undefined, button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    const canOpenDown = rect.bottom + MENU_HEIGHT + 16 <= window.innerHeight;
    const top = canOpenDown ? rect.bottom + 8 : rect.top - MENU_HEIGHT - 8;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - MENU_WIDTH - 8);

    setOpenMenu({ kind, id, top: Math.max(8, top), left });
  }

  function clearSavedData() {
    if (!window.confirm('Delete all saved riders and settings from this device?')) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SORT_MODE_KEY);
    setRiders([makeRider(true)]);
    setSortMode('alpha');
    closeMenu();
  }

  function resetAllCounts() {
    if (!window.confirm('Reset all lap counts to zero for every rider?')) {
      return;
    }

    setRiders((currentRiders) => currentRiders.map((rider) => ({ ...rider, count: 0 })));
    closeMenu();
  }

  function commitName(id: string, value: string) {
    const trimmedName = value.trim();
    if (!trimmedName) {
      return;
    }

    updateRider(id, (current) => ({
      ...current,
      name: trimmedName,
      draft: false,
    }));
  }

  function deleteRider(id: string) {
    const rider = riders.find((entry) => entry.id === id);
    if (!rider) {
      return;
    }

    if (window.confirm(`Delete ${rider.name || 'this entry'}?`)) {
      setRiders((currentRiders) => {
        const remaining = currentRiders.filter((entry) => entry.id !== id);
        return remaining.length > 0 ? remaining : [makeRider(true)];
      });
      closeMenu();
    }
  }

  function resetRiderCount(id: string) {
    const rider = riders.find((entry) => entry.id === id);
    if (!rider) {
      return;
    }

    if (window.confirm(`Reset the lap count for ${rider.name || 'this rider'} to zero?`)) {
      updateRider(id, (current) => ({
        ...current,
        count: 0,
      }));
      closeMenu();
    }
  }

  function adjustCount(id: string, delta: number) {
    updateRider(id, (current) => ({
      ...current,
      count: Math.max(0, current.count + delta),
    }));
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-brand">
          <img className="hero-logo" src={ofcLogo} alt="Oakwood First Church" />
          <div>
            <p className="eyebrow">Bike-a-Thon</p>
            <h1>Lap Tracker</h1>
          </div>
        </div>
        <p className="intro">Add riders, tally laps, and keep the list saved on this device for quick updates during the event.</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={addRider}>
            Add Name
          </button>
          {installPrompt && !isInstalled ? (
            <button className="secondary-button" type="button" onClick={installApp}>
              Install app
            </button>
          ) : null}
        </div>
      </section>

      <section className="tracker" aria-label="Lap tracker">
        <div className="tracker-body">
          {visibleRiders.map((rider) => (
            <div key={rider.id} className="rider-row">
              <div className="menu-cell">
                <button
                  type="button"
                  className="menu-trigger"
                  aria-label={`Open actions for ${rider.name || 'rider'}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (openMenu?.kind === 'rider' && openMenu.id === rider.id) {
                      closeMenu();
                      return;
                    }

                    openMenuFromButton('rider', rider.id, event.currentTarget);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16v2H4V7Zm0 4.5h16v2H4v-2Zm0 4.5h16v2H4v-2Z" />
                  </svg>
                </button>
              </div>

              <div className="name-cell">
                {rider.draft ? (
                  <input
                    autoFocus
                    aria-label="Rider name"
                    className="name-input"
                    defaultValue={rider.name}
                    placeholder="Enter a name"
                    onBlur={(event) => commitName(rider.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                ) : (
                  <button
                    className="name-display"
                    type="button"
                    onClick={() => {
                      updateRider(rider.id, (current) => ({ ...current, draft: true }));
                    }}
                    aria-label={`Edit ${rider.name}`}
                  >
                    {rider.name}
                  </button>
                )}
              </div>

              <div className="count-cell" aria-label={`Lap count for ${rider.name || 'new rider'}`}>
                <span className="count-value">{rider.count}</span>
              </div>

              <div className="action-cell count-actions">
                <button type="button" className="count-button" onClick={() => adjustCount(rider.id, -1)} aria-label={`Subtract lap for ${rider.name || 'new rider'}`}>
                  -
                </button>
                <button type="button" className="count-button" onClick={() => adjustCount(rider.id, 1)} aria-label={`Add lap for ${rider.name || 'new rider'}`}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="tracker-footer">
          <label className="sort-select-wrap">
            <select
              className="sort-select"
              aria-label="Sort riders"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="alpha">Sorted A to Z</option>
              <option value="desc">Sorted Highest to Lowest</option>
              <option value="asc">Sorted Lowest to Highest</option>
            </select>
          </label>
          <button
            type="button"
            className="footer-menu-trigger"
            aria-label="Open data actions"
            onClick={(event) => {
              event.stopPropagation();
              if (openMenu?.kind === 'footer') {
                closeMenu();
                return;
              }

              openMenuFromButton('footer', undefined, event.currentTarget);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16v2H4V7Zm0 4.5h16v2H4v-2Zm0 4.5h16v2H4v-2Z" />
            </svg>
          </button>
        </div>
      </section>

      {openMenu ? (
        <button type="button" className="menu-backdrop" aria-label="Close menu" onClick={closeMenu}>
          <span className="sr-only">Close menu</span>
        </button>
      ) : null}

      {openMenu ? (
        <div ref={floatingMenuRef} className="menu-panel floating-menu" aria-label={openMenu.kind === 'rider' ? 'Rider actions' : 'Data actions'}>
          {openMenu.kind === 'rider' ? (
            <>
              <button type="button" className="menu-item" onClick={() => resetRiderCount(openMenu.id as string)}>
                Reset count
              </button>
              <button type="button" className="menu-item danger" onClick={() => deleteRider(openMenu.id as string)}>
                Delete person
              </button>
            </>
          ) : (
            <>
              <button type="button" className="menu-item" onClick={resetAllCounts}>
                Reset all counts
              </button>
              <button type="button" className="menu-item danger" onClick={clearSavedData}>
                Delete all data
              </button>
            </>
          )}
        </div>
      ) : null}

      <footer className="footer">
        <p>
          {riders.filter((rider) => !rider.draft).length} rider{riders.filter((rider) => !rider.draft).length === 1 ? '' : 's'} saved locally.
        </p>
      </footer>
    </main>
  );
}

export default App;
