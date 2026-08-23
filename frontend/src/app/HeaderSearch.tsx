import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, User as UserIcon } from 'lucide-react';
import { useProducts } from '../lib/queries';
import { useCustomers } from '../features/customers/hooks';
import { useAuth } from '../features/auth/AuthContext';

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function SearchResults({ query, onNavigate }: { query: string; onNavigate: () => void }) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const navigate = useNavigate();

  const products = useProducts(query);
  const customers = useCustomers({ search: query, tier: 'ALL', enabled: isManager });

  const matchedProducts = (products.data ?? []).slice(0, 5);
  const matchedCustomers = isManager ? (customers.data ?? []).slice(0, 5) : [];
  const isEmpty = matchedProducts.length === 0 && matchedCustomers.length === 0;

  function go(path: string) {
    navigate(path);
    onNavigate();
  }

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-surface py-2 shadow-lg">
      {isEmpty && <div className="px-4 py-6 text-center text-sm text-fg-subtle">No matches for "{query}"</div>}

      {matchedProducts.length > 0 && (
        <div className="px-2">
          <div className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">Products</div>
          {matchedProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => go('/inventory')}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
            >
              <Package size={15} className="shrink-0 text-fg-subtle" />
              <span className="truncate text-fg">{p.name}</span>
              <span className="ml-auto shrink-0 text-xs text-fg-subtle">{p.shopQty} in shop</span>
            </button>
          ))}
        </div>
      )}

      {matchedCustomers.length > 0 && (
        <div className="px-2 pt-1">
          <div className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">Customers</div>
          {matchedCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => go('/customers')}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-2"
            >
              <UserIcon size={15} className="shrink-0 text-fg-subtle" />
              <span className="truncate text-fg">{c.fullName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeaderSearch() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const debouncedQuery = useDebounced(query, 200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showResults = focused && debouncedQuery.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Search products, customers…"
        className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-100"
      />
      {showResults && <SearchResults query={debouncedQuery.trim()} onNavigate={() => setFocused(false)} />}
    </div>
  );
}
