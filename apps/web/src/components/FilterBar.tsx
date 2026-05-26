import React, { useState, useEffect } from 'react';
import { Search, Clock, CalendarDays, ArrowDown, ArrowUp, X, Filter } from 'lucide-react';
import { Dialog, DialogContent } from '@/src/components/ui/dialog';

export type SortOrder = 'newest' | 'oldest' | 'shortest' | 'longest';

export type FilterOptions = {
  search: string;
  maxDuration: number | null; // em segundos
  sortOrder: SortOrder;
};

type FilterBarProps = {
  onChange: (filters: FilterOptions) => void;
  initialFilters?: FilterOptions;
};

const DEFAULT_FILTERS: FilterOptions = {
  search: '',
  maxDuration: null,
  sortOrder: 'newest',
};

const DURATION_OPTIONS = [
  { value: 5 * 60, label: '5m' },
  { value: 10 * 60, label: '10m' },
  { value: 15 * 60, label: '15m' },
  { value: 30 * 60, label: '30m' },
  { value: 60 * 60, label: '60m' },
  { value: null, label: 'any' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  onChange,
  initialFilters = DEFAULT_FILTERS,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  const activeFilterCount = [
    filters.search,
    filters.maxDuration !== null,
    filters.sortOrder !== 'newest',
  ].filter(Boolean).length;

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedSearch]);

  useEffect(() => {
    onChange(filters);
  }, [filters, onChange]);

  const applyFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedSearch('');
  };

  const removeFilter = (filterKey: keyof FilterOptions) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: DEFAULT_FILTERS[filterKey],
    }));
    if (filterKey === 'search') {
      setDebouncedSearch('');
    }
  };

  const toggleDateSort = () => {
    const newOrder = filters.sortOrder === 'newest' ? 'oldest' : 'newest';
    applyFilters({ sortOrder: newOrder });
  };

  const toggleDurationSort = () => {
    const newOrder = filters.sortOrder === 'shortest' ? 'longest' : 'shortest';
    applyFilters({ sortOrder: newOrder });
  };

  const isDateSortActive = filters.sortOrder === 'newest' || filters.sortOrder === 'oldest';
  const isDurationSortActive = filters.sortOrder === 'shortest' || filters.sortOrder === 'longest';

  const chip = (active: boolean) =>
    `border-1.5 border-ink px-2 py-1 text-[10px] font-bold font-mono ${
      active ? 'bg-ink text-paper' : 'bg-white hover:bg-paper'
    }`;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {activeFilterCount > 0 && (
          <div className="flex flex-col items-end gap-1">
            {filters.search && (
              <button
                onClick={() => removeFilter('search')}
                className="bg-white border-1.5 border-ink text-ink px-2 py-1 flex items-center gap-1.5 font-mono text-[10px] font-bold hover:bg-paper"
              >
                <span>search: {filters.search}</span>
                <X size={12} />
              </button>
            )}

            {filters.maxDuration !== null && (
              <button
                onClick={() => removeFilter('maxDuration')}
                className="bg-white border-1.5 border-ink text-ink px-2 py-1 flex items-center gap-1.5 font-mono text-[10px] font-bold hover:bg-paper"
              >
                <span>max: {Math.floor(filters.maxDuration / 60)}m</span>
                <X size={12} />
              </button>
            )}

            {filters.sortOrder !== 'newest' && (
              <button
                onClick={() => removeFilter('sortOrder')}
                className="bg-white border-1.5 border-ink text-ink px-2 py-1 flex items-center gap-1.5 font-mono text-[10px] font-bold hover:bg-paper"
              >
                <span>
                  sort: {filters.sortOrder === 'oldest' ? 'oldest' :
                         filters.sortOrder === 'shortest' ? 'shortest' :
                         'longest'}
                </span>
                <X size={12} />
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setIsModalOpen(true)}
          className="relative bg-ink text-paper border-2 border-ink shadow-brutal-red w-12 h-12 flex items-center justify-center hover:translate-y-px transition-transform"
        >
          <Filter className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-accent text-paper text-[9px] font-bold w-5 h-5 flex items-center justify-center border-1.5 border-ink">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="bg-paper border-2 border-ink text-ink p-0 shadow-brutal-red sm:max-w-md"
          style={{ zIndex: 100, borderRadius: 0 }}
        >
          <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold font-mono">
            <span>▸ FILTER_VIDEOS</span>
            <button onClick={clearAllFilters} className="text-accent hover:underline">
              [reset]
            </button>
          </div>

          <div className="p-4 flex flex-col gap-5 font-mono">
            <div>
              <label className="block text-[10px] font-bold tracking-wider mb-2">▸ SEARCH</label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="search videos…"
                  value={debouncedSearch}
                  onChange={(e) => setDebouncedSearch(e.target.value)}
                  className="w-full py-2 pl-9 pr-3 border-1.5 border-ink bg-white text-ink placeholder-neutral-500 focus:outline-none text-[12px]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider mb-2 flex items-center">
                <Clock size={12} className="mr-1.5" /> ▸ MAX_DURATION
              </label>
              <div className="flex flex-wrap gap-1">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value?.toString() || 'null'}
                    className={chip(filters.maxDuration === option.value)}
                    onClick={() => applyFilters({ maxDuration: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider mb-2">▸ SORT_BY</label>
              <div className="flex gap-1.5">
                <button
                  onClick={toggleDateSort}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold flex-1 border-1.5 border-ink ${
                    isDateSortActive ? 'bg-ink text-paper' : 'bg-white hover:bg-paper'
                  }`}
                >
                  <CalendarDays size={14} />
                  <span>date</span>
                  {filters.sortOrder === 'newest' && <ArrowDown size={14} />}
                  {filters.sortOrder === 'oldest' && <ArrowUp size={14} />}
                </button>

                <button
                  onClick={toggleDurationSort}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold flex-1 border-1.5 border-ink ${
                    isDurationSortActive ? 'bg-ink text-paper' : 'bg-white hover:bg-paper'
                  }`}
                >
                  <Clock size={14} />
                  <span>length</span>
                  {filters.sortOrder === 'shortest' && <ArrowUp size={14} />}
                  {filters.sortOrder === 'longest' && <ArrowDown size={14} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="bg-ink text-paper border-2 border-ink shadow-brutal-red py-2.5 px-4 w-full font-bold font-mono text-[11px]"
            >
              ▶ APPLY FILTERS
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
