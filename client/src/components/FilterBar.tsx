import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Clock, CalendarDays, ArrowDown, ArrowUp, X, Filter } from 'lucide-react';
import { Badge } from './ui/badge';
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
  { value: 5 * 60, label: '5 min' },
  { value: 10 * 60, label: '10 min' },
  { value: 15 * 60, label: '15 min' },
  { value: 30 * 60, label: '30 min' },
  { value: 60 * 60, label: '60 min' },
  { value: null, label: 'Any' },
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
      [filterKey]: DEFAULT_FILTERS[filterKey]
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

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
        {(activeFilterCount > 0) && (
          <div className="mb-3 flex flex-col items-end gap-2">
            {filters.search && (
              <Badge 
                className="bg-white/10 backdrop-blur-md hover:bg-white/15 text-white px-3 py-1.5 flex items-center gap-1.5 shadow-lg"
                onClick={() => removeFilter('search')}
              >
                <span className="text-xs font-normal">Search: {filters.search}</span>
                <X size={14} />
              </Badge>
            )}
            
            {filters.maxDuration !== null && (
              <Badge 
                className="bg-white/10 backdrop-blur-md hover:bg-white/15 text-white px-3 py-1.5 flex items-center gap-1.5 shadow-lg"
                onClick={() => removeFilter('maxDuration')}
              >
                <span className="text-xs font-normal">
                  Max duration: {Math.floor(filters.maxDuration / 60)} min
                </span>
                <X size={14} />
              </Badge>
            )}
            
            {filters.sortOrder !== 'newest' && (
              <Badge 
                className="bg-white/10 backdrop-blur-md hover:bg-white/15 text-white px-3 py-1.5 flex items-center gap-1.5 shadow-lg"
                onClick={() => removeFilter('sortOrder')}
              >
                <span className="text-xs font-normal">
                  Sort: {filters.sortOrder === 'oldest' ? 'Oldest first' : 
                         filters.sortOrder === 'shortest' ? 'Shortest first' : 
                         'Longest first'}
                </span>
                <X size={14} />
              </Badge>
            )}
          </div>
        )}
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 rounded-full w-14 h-14 flex items-center justify-center text-white shadow-xl transition-all duration-200 hover:scale-105"
        >
          <Filter className="w-6 h-6" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border border-white/20 text-white p-6 shadow-xl rounded-xl sm:max-w-md">
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Filter Videos</h2>
              <button 
                onClick={clearAllFilters}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Reset all filters
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search videos..."
                value={debouncedSearch}
                onChange={(e) => setDebouncedSearch(e.target.value)}
                className="w-full py-3 pl-10 pr-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
                autoFocus
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Clock size={14} className="mr-2" /> Video Duration
              </h4>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value?.toString() || 'null'}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      filters.maxDuration === option.value 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    } transition-colors`}
                    onClick={() => applyFilters({ maxDuration: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Sort By</h4>
              <div className="flex gap-3">
                <button
                  onClick={toggleDateSort}
                  className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-sm flex-1 ${
                    isDateSortActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <CalendarDays size={16} />
                  <span>Date</span>
                  {filters.sortOrder === 'newest' && <ArrowDown size={16} />}
                  {filters.sortOrder === 'oldest' && <ArrowUp size={16} />}
                </button>
                
                <button
                  onClick={toggleDurationSort}
                  className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-sm flex-1 ${
                    isDurationSortActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <Clock size={16} />
                  <span>Length</span>
                  {filters.sortOrder === 'shortest' && <ArrowUp size={16} />}
                  {filters.sortOrder === 'longest' && <ArrowDown size={16} />}
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg mt-2 w-full"
            >
              Apply Filters
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};