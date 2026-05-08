import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ofcLogo from '../assets/ofc-log-no-text.svg';
import type { OpenMenu, Rider, SortMode } from '../types';

const STORAGE_KEY = 'bike-a-thon-riders';
const SORT_MODE_KEY = 'bike-a-thon-sort-mode';
const MENU_WIDTH = 192;
const MENU_HEIGHT = 152;

function readRiders(): Rider[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

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

function sortVisibleRiders(riders: Rider[], sortMode: SortMode): Rider[] {
  const drafts = riders.filter((rider) => rider.draft);
  const committed = riders
    .filter((rider) => !rider.draft)
    .slice()
    .sort((left, right) => {
      if (sortMode === 'desc' && right.count !== left.count) return right.count - left.count;
      if (sortMode === 'asc' && right.count !== left.count) return left.count - right.count;
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });
  return [...committed, ...drafts];
}

function getSortLabel(mode: SortMode): string {
  if (mode === 'alpha') return 'A to Z';
  if (mode === 'desc') return 'High to Low';
  return 'Low to High';
}

export function BikeAThonPage() {
  const [riders, setRiders] = useState<Rider[]>(() =>
    readRiders().filter((r) => !r.draft && r.name.trim()),
  );
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode());
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
  const [nameInput, setNameInput] = useState('');
  const floatingMenuRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    document.title = 'OFC Tools | Bike-a-Thon';
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(riders));
  }, [riders]);

  useEffect(() => {
    window.localStorage.setItem(SORT_MODE_KEY, sortMode);
  }, [sortMode]);

  useEffect(() => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker?.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
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
    if (!menuElement || !openMenu) return;
    menuElement.style.top = `${openMenu.top}px`;
    menuElement.style.left = `${openMenu.left}px`;
  }, [openMenu]);

  const visibleRiders = useMemo(() => sortVisibleRiders(riders, sortMode), [riders, sortMode]);

  function updateRider(id: string, updater: (current: Rider) => Rider) {
    setRiders((current) => current.map((r) => (r.id === id ? updater(r) : r)));
  }

  function addRiderByName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setRiders((current) => [
      ...current,
      { id: crypto.randomUUID(), name: trimmed, count: 0, draft: false },
    ]);
    setNameInput('');
    nameInputRef.current?.focus();
  }

  function cycleSortMode() {
    setSortMode((current) => (current === 'alpha' ? 'desc' : current === 'desc' ? 'asc' : 'alpha'));
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

  function handleRiderPointerDown(id: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      isLongPressRef.current = true;
      openMenuFromButton('rider', id, target);
    }, 600);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleRiderClick(id: string) {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    adjustCount(id, 1);
  }

  function handleRiderContextMenu(id: string, event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    cancelLongPress();
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    openMenuFromButton('rider', id, event.currentTarget);
  }

  function clearSavedData() {
    if (!window.confirm('Delete all saved riders and settings from this device?')) return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SORT_MODE_KEY);
    setRiders([]);
    setSortMode('alpha');
    closeMenu();
  }

  function resetAllCounts() {
    if (!window.confirm('Reset all lap counts to zero for every rider?')) return;
    setRiders((current) => current.map((r) => ({ ...r, count: 0 })));
    closeMenu();
  }

  function deleteRider(id: string) {
    const rider = riders.find((r) => r.id === id);
    if (!rider) return;
    if (window.confirm(`Delete ${rider.name}?`)) {
      setRiders((current) => current.filter((r) => r.id !== id));
      closeMenu();
    }
  }

  function resetRiderCount(id: string) {
    const rider = riders.find((r) => r.id === id);
    if (!rider) return;
    if (window.confirm(`Reset the lap count for ${rider.name} to zero?`)) {
      updateRider(id, (current) => ({ ...current, count: 0 }));
      closeMenu();
    }
  }

  function adjustCount(id: string, delta: number) {
    updateRider(id, (current) => ({
      ...current,
      count: Math.max(0, current.count + delta),
    }));
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-brand">
          <Link className="hero-logo-link" to="/" aria-label="Go to OFC Tools home">
            <img className="hero-logo" src={ofcLogo} alt="OFC Tools" />
          </Link>
          <div>
            <p className="eyebrow">OFC Tools</p>
            <h1>Bike-a-Thon Lap Tracker</h1>
          </div>
        </div>
        <p className="intro">Add riders, tally laps, and keep the list saved on this device for quick updates during the event.</p>
      </section>

      <section className="tracker" aria-label="Lap tracker">
        <div className="tracker-header">
          <div className="add-rider-bar">
            <input
              ref={nameInputRef}
              className="add-name-input"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addRiderByName();
              }}
              placeholder="Enter a name"
              aria-label="Rider name"
              maxLength={50}
            />
            <button
              type="button"
              className="add-name-btn"
              aria-label="Add rider"
              onClick={addRiderByName}
            >
              +
            </button>
          </div>

          <div className="tracker-toolbar">
            <button
              type="button"
              className="sort-cycle-btn"
              onClick={cycleSortMode}
              aria-label={`Sort: ${getSortLabel(sortMode)}. Tap to change.`}
            >
              ⇅ {getSortLabel(sortMode)}
            </button>
            <button
              type="button"
              className="count-button footer-menu-trigger"
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
        </div>

        <div className="rider-grid">
          {visibleRiders.map((rider) => (
            <button
              key={rider.id}
              type="button"
              className="rider-tile"
              onPointerDown={(e) => handleRiderPointerDown(rider.id, e)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onClick={() => handleRiderClick(rider.id)}
              onContextMenu={(e) => handleRiderContextMenu(rider.id, e)}
              aria-label={`${rider.name}, ${rider.count} laps. Tap to add lap.`}
            >
              <span className="rider-tile-name">{rider.name}</span>
              <span className="rider-tile-count">{rider.count}</span>
            </button>
          ))}
        </div>

        {riders.length === 0 && (
          <p className="rider-grid-empty">Add names above to get started.</p>
        )}
      </section>

      {openMenu ? (
        <button type="button" className="menu-backdrop" aria-label="Close menu" onClick={closeMenu}>
          <span className="sr-only">Close menu</span>
        </button>
      ) : null}

      {openMenu ? (
        <div
          ref={floatingMenuRef}
          className="menu-panel floating-menu"
          aria-label={openMenu.kind === 'rider' ? 'Rider actions' : 'Data actions'}
        >
          {openMenu.kind === 'rider' ? (
            <>
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  adjustCount(openMenu.id as string, -1);
                  closeMenu();
                }}
              >
                Decrease by 1
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => resetRiderCount(openMenu.id as string)}
              >
                Reset to 0
              </button>
              <button
                type="button"
                className="menu-item danger"
                onClick={() => deleteRider(openMenu.id as string)}
              >
                Delete
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
    </main>
  );
}
