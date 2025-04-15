import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Clock, CalendarDays, ArrowDown, ArrowUp, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export type SortOrder = 'newest' | 'oldest' | 'shortest' | 'longest';

export type FilterOptions = {
  search: string;
  maxDuration: number | null;
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const activeFilterCount = [
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
    <div className="w-full mt-6">
      <div className="flex flex-col md:flex-row gap-4 mb-3">
        <div className={`${isSearchFocused || debouncedSearch ? 'flex-1' : 'w-48 md:w-64'} relative transition-all duration-300`}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search videos..."
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full py-2.5 pl-10 pr-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
          />
        </div>
        
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 relative"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/20 text-white p-4 shadow-xl rounded-xl">
            <h3 className="font-medium text-white mb-4 flex justify-between items-center">
              Filter Videos
              <button 
                onClick={clearAllFilters}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Reset all
              </button>
            </h3>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Clock size={14} className="mr-2" /> Video Duration
              </h4>
              <div className="space-y-3">
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
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-3">Sort By</h4>
              <div className="flex gap-3">
                <button
                  onClick={toggleDateSort}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm flex-1 ${
                    isDateSortActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <CalendarDays size={14} />
                  <span>Date</span>
                  {filters.sortOrder === 'newest' && <ArrowDown size={14} />}
                  {filters.sortOrder === 'oldest' && <ArrowUp size={14} />}
                </button>
                
                <button
                  onClick={toggleDurationSort}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm flex-1 ${
                    isDurationSortActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <Clock size={14} />
                  <span>Length</span>
                  {filters.sortOrder === 'shortest' && <ArrowUp size={14} />}
                  {filters.sortOrder === 'longest' && <ArrowDown size={14} />}
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {(activeFilterCount > 0 || filters.search) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.search && (
            <Badge 
              className="bg-white/10 hover:bg-white/15 text-white px-3 py-1 flex items-center gap-1.5"
              onClick={() => {
                setDebouncedSearch('');
                removeFilter('search');
              }}
            >
              <span className="text-xs font-normal">Search: {filters.search}</span>
              <X size={14} />
            </Badge>
          )}
          
          {filters.maxDuration !== null && (
            <Badge 
              className="bg-white/10 hover:bg-white/15 text-white px-3 py-1 flex items-center gap-1.5"
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
              className="bg-white/10 hover:bg-white/15 text-white px-3 py-1 flex items-center gap-1.5"
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
          
          <button 
            onClick={clearAllFilters}
            className="text-xs text-white/70 hover:text-white ml-1 underline underline-offset-2"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};