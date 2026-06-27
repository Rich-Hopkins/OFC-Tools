import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ofcLogo from '../assets/ofc-log-no-text.svg';

const DENOMINATIONS = [
  { id: 'hundreds', label: 'Hundreds', valueCents: 10000, isCoin: false },
  { id: 'fifties', label: 'Fifties', valueCents: 5000, isCoin: false },
  { id: 'twenties', label: 'Twenties', valueCents: 2000, isCoin: false },
  { id: 'tens', label: 'Tens', valueCents: 1000, isCoin: false },
  { id: 'fives', label: 'Fives', valueCents: 500, isCoin: false },
  { id: 'ones', label: 'Ones', valueCents: 100, isCoin: false },
  { id: 'dollars', label: 'Silver Dollars', valueCents: 100, isCoin: true },
  { id: 'halves', label: 'Half Dollars', valueCents: 50, isCoin: true },
  { id: 'quarters', label: 'Quarters', valueCents: 25, isCoin: true },
  { id: 'dimes', label: 'Dimes', valueCents: 10, isCoin: true },
  { id: 'nickels', label: 'Nickels', valueCents: 5, isCoin: true },
  { id: 'pennies', label: 'Pennies', valueCents: 1, isCoin: true },
] as const;

type DenomId = (typeof DENOMINATIONS)[number]['id'];

interface CounterState {
  values: Record<DenomId, string>;
  errors: Record<DenomId, string | undefined>;
}

function makeCounterState(): CounterState {
  return {
    values: Object.fromEntries(DENOMINATIONS.map((d) => [d.id, ''])) as Record<DenomId, string>,
    errors: Object.fromEntries(DENOMINATIONS.map((d) => [d.id, undefined])) as Record<
      DenomId,
      string | undefined
    >,
  };
}

function formatDenomAmount(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatCoinCents(cents: number): string {
  if (cents === 0) return '';
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${dollars}.${remainder.toString().padStart(2, '0')}`;
}

function totalCents(state: CounterState): number {
  return DENOMINATIONS.reduce((acc, d) => {
    if (state.errors[d.id]) return acc;
    const v = state.values[d.id];
    if (!v) return acc;
    if (d.isCoin) {
      const cents = parseInt(v, 10);
      return isNaN(cents) ? acc : acc + cents;
    }
    const dollars = parseFloat(v);
    if (isNaN(dollars) || dollars < 0) return acc;
    return acc + Math.round(dollars * 100);
  }, 0);
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function validateBill(value: string, valueCents: number): string | undefined {
  if (value === '' || value === '0' || value === '0.00') return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) return 'Invalid number';
  if (num < 0) return 'Cannot be negative';
  const cents = Math.round(num * 100);
  if (cents % valueCents !== 0) return `Must be a multiple of ${formatDenomAmount(valueCents)}`;
  return undefined;
}

const MAX_COIN_CENTS = 9_999_999;

function makeHandlers(setState: Dispatch<SetStateAction<CounterState>>) {
  return {
    onBillChange(id: DenomId, value: string) {
      const sanitized = value.replace(/\$/g, '').trim();
      setState((prev) => ({
        ...prev,
        values: { ...prev.values, [id]: sanitized },
        errors: { ...prev.errors, [id]: undefined },
      }));
    },
    onBillBlur(id: DenomId, value: string) {
      const denom = DENOMINATIONS.find((d) => d.id === id)!;
      const sanitized = value.replace(/\$/g, '').trim();
      const normalized = sanitized.startsWith('.') ? '0' + sanitized : sanitized;
      const error = validateBill(normalized, denom.valueCents);
      setState((prev) => ({
        ...prev,
        values: { ...prev.values, [id]: normalized },
        errors: { ...prev.errors, [id]: error },
      }));
    },
    onCoinChange(id: DenomId, cents: number) {
      setState((prev) => ({
        ...prev,
        values: { ...prev.values, [id]: cents === 0 ? '' : cents.toString() },
        errors: { ...prev.errors, [id]: undefined },
      }));
    },
    onCoinBlur(id: DenomId) {
      const denom = DENOMINATIONS.find((d) => d.id === id)!;
      setState((prev) => {
        const v = prev.values[id];
        if (!v) return prev;
        const cents = parseInt(v, 10);
        const error =
          !isNaN(cents) && cents > 0 && cents % denom.valueCents !== 0
            ? `Must be a multiple of ${formatDenomAmount(denom.valueCents)}`
            : undefined;
        return { ...prev, errors: { ...prev.errors, [id]: error } };
      });
    },
  };
}

interface CoinInputProps {
  id: string;
  label: string;
  cents: number;
  error: string | undefined;
  onCentsChange: (cents: number) => void;
  onBlur: () => void;
}

function CoinInput({ id, label, cents, error, onCentsChange, onBlur }: CoinInputProps) {
  const displayValue = formatCoinCents(cents);
  const replaceOnTypeRef = useRef(false);

  function pushDigit(digit: number) {
    onCentsChange(Math.min(cents * 10 + digit, MAX_COIN_CENTS));
  }

  function popDigit() {
    onCentsChange(Math.floor(cents / 10));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const hasSelection =
      e.currentTarget.selectionStart !== null &&
      e.currentTarget.selectionEnd !== null &&
      e.currentTarget.selectionStart !== e.currentTarget.selectionEnd;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const digit = parseInt(e.key, 10);
      if (replaceOnTypeRef.current || hasSelection) {
        onCentsChange(digit);
      } else {
        pushDigit(digit);
      }
      replaceOnTypeRef.current = false;
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (replaceOnTypeRef.current || hasSelection) {
        onCentsChange(0);
      } else {
        popDigit();
      }
      replaceOnTypeRef.current = false;
    } else if (e.key === 'Delete') {
      e.preventDefault();
      onCentsChange(0);
      replaceOnTypeRef.current = false;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      replaceOnTypeRef.current = false;
      e.currentTarget.blur();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDigits = e.target.value.replace(/\D/g, '');
    const oldDigits = displayValue.replace(/\D/g, '');
    if (newDigits.length > oldDigits.length) {
      const lastDigit = parseInt(newDigits[newDigits.length - 1], 10);
      if (!isNaN(lastDigit)) pushDigit(lastDigit);
    } else if (newDigits.length < oldDigits.length) {
      popDigit();
    }
  }

  return (
    <input
      id={id}
      className={`denomination-input${error ? ' denomination-input--error' : ''}`}
      type="text"
      inputMode="numeric"
      value={displayValue}
      placeholder="$0.00"
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onBlur={() => {
        replaceOnTypeRef.current = false;
        onBlur();
      }}
      onFocus={(e) => {
        replaceOnTypeRef.current = true;
        e.target.select();
      }}
      onPaste={(e) => e.preventDefault()}
      aria-label={`${label} dollar value`}
      aria-describedby={error ? `${id}-error` : undefined}
    />
  );
}

interface CounterPanelProps {
  title: string;
  state: CounterState;
  onBillChange: (id: DenomId, value: string) => void;
  onBillBlur: (id: DenomId, value: string) => void;
  onCoinChange: (id: DenomId, cents: number) => void;
  onCoinBlur: (id: DenomId) => void;
}

function CounterPanel({
  title,
  state,
  onBillChange,
  onBillBlur,
  onCoinChange,
  onCoinBlur,
}: CounterPanelProps) {
  const total = totalCents(state);
  const hasErrors = DENOMINATIONS.some((d) => state.errors[d.id]);
  const panelId = title.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="drawer-panel">
      <h2 className="drawer-panel-title">{title}</h2>
      <div className="denomination-table">
        {DENOMINATIONS.map((denom, i) => {
          const inputId = `${denom.id}-${panelId}`;
          const errorId = `${inputId}-error`;
          return (
            <div key={denom.id}>
              {i === 6 && <div className="denomination-divider" aria-hidden="true" />}
              <div className="denomination-row">
                <label className="denomination-label" htmlFor={inputId}>
                  {denom.label}
                </label>
                {denom.isCoin ? (
                  <CoinInput
                    id={inputId}
                    label={denom.label}
                    cents={parseInt(state.values[denom.id] || '0', 10)}
                    error={state.errors[denom.id]}
                    onCentsChange={(cents) => onCoinChange(denom.id, cents)}
                    onBlur={() => onCoinBlur(denom.id)}
                  />
                ) : (
                  <input
                    id={inputId}
                    className={`denomination-input${state.errors[denom.id] ? ' denomination-input--error' : ''}`}
                    type="text"
                    inputMode="decimal"
                    placeholder="$0.00"
                    value={state.values[denom.id] ? `$${state.values[denom.id]}` : ''}
                    onChange={(e) => onBillChange(denom.id, e.target.value)}
                    onBlur={(e) => onBillBlur(denom.id, e.target.value)}
                    onKeyDown={(e) => {
                      const replaceOnType = e.currentTarget.dataset.replaceOnType === '1';
                      const hasSelection =
                        e.currentTarget.selectionStart !== null &&
                        e.currentTarget.selectionEnd !== null &&
                        e.currentTarget.selectionStart !== e.currentTarget.selectionEnd;

                      if ((replaceOnType || hasSelection) && /^[0-9.]$/.test(e.key)) {
                        e.preventDefault();
                        onBillChange(denom.id, e.key);
                        e.currentTarget.dataset.replaceOnType = '0';
                        return;
                      }

                      if (e.key === 'Backspace' || e.key === 'Delete') {
                        e.currentTarget.dataset.replaceOnType = '0';
                      }

                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.dataset.replaceOnType = '0';
                        e.currentTarget.blur();
                      }
                    }}
                    onFocus={(e) => {
                      e.currentTarget.dataset.replaceOnType = '1';
                      e.target.select();
                    }}
                    aria-label={`${denom.label} dollar value`}
                    aria-describedby={state.errors[denom.id] ? errorId : undefined}
                  />
                )}
              </div>
              {state.errors[denom.id] && (
                <p className="denomination-error" id={errorId} role="alert">
                  {state.errors[denom.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="drawer-total-row">
        <span className="drawer-total-label">
          Total{hasErrors && <span className="drawer-total-asterisk"> *</span>}
        </span>
        <span className="drawer-total-value">{formatDollars(total)}</span>
      </div>
      {hasErrors && <p className="drawer-total-note">* Invalid fields excluded from total</p>}
    </div>
  );
}

export function DrawerCountPage() {
  const [counter1, setCounter1] = useState<CounterState>(makeCounterState);
  const [counter2, setCounter2] = useState<CounterState>(makeCounterState);
  const handlers1 = makeHandlers(setCounter1);
  const handlers2 = makeHandlers(setCounter2);

  useEffect(() => {
    document.title = 'OFC Tools | Drawer Counter';
  }, []);

  function resetAll() {
    if (!window.confirm('Reset both counters and clear all entered amounts?')) return;
    setCounter1(makeCounterState());
    setCounter2(makeCounterState());
  }

  const total1 = totalCents(counter1);
  const total2 = totalCents(counter2);
  const diff = Math.abs(total1 - total2);
  const bothCounted = total1 > 0 && total2 > 0;
  const isMatch = bothCounted && diff === 0;

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-brand">
          <Link className="hero-logo-link" to="/" aria-label="Go to OFC Tools home">
            <img className="hero-logo" src={ofcLogo} alt="OFC Tools" />
          </Link>
          <div>
            <p className="eyebrow">OFC Tools</p>
            <h1>Drawer Counter</h1>
          </div>
        </div>
        <p className="intro">
          Enter the dollar value for each denomination. Two independent counters verify the total
          matches.
        </p>
        <div className="hero-actions">
          <button type="button" className="secondary-button" onClick={resetAll}>
            Reset
          </button>
        </div>
      </section>

      {bothCounted && (
        <div
          className={`drawer-comparison ${isMatch ? 'drawer-match' : 'drawer-mismatch'}`}
          role="status"
        >
          {isMatch ? (
            <>✓ Both counters match — {formatDollars(total1)}</>
          ) : (
            <>✗ Totals differ by {formatDollars(diff)} — recount recommended</>
          )}
        </div>
      )}

      <div className="drawer-grid">
        <CounterPanel
          title="First Counter"
          state={counter1}
          onBillChange={handlers1.onBillChange}
          onBillBlur={handlers1.onBillBlur}
          onCoinChange={handlers1.onCoinChange}
          onCoinBlur={handlers1.onCoinBlur}
        />
        <CounterPanel
          title="Second Counter"
          state={counter2}
          onBillChange={handlers2.onBillChange}
          onBillBlur={handlers2.onBillBlur}
          onCoinChange={handlers2.onCoinChange}
          onCoinBlur={handlers2.onCoinBlur}
        />
      </div>
    </main>
  );
}
