'use client';

import { useTranslation } from 'react-i18next';

import { useState, Suspense } from 'react';
import { Filter, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordGrid } from '@/components/records/RecordGrid';
import { useRecords } from '@/hooks/useRecords';
import { useStore } from '@/store';
import { TopLayout } from '@/components/layout/TopLayout';
import {
  ArtistFilter,
  LabelFilter,
  StyleFilter,
  PriceRangeFilter,
  ConditionFilter,
  FilterCard,
  ActiveFilters,
  FilterSheet
} from '@/components/filters';

export default function BrowsePage() {
  const { t } = useTranslation(['common', 'filters'] as const);
  const { 
    releases, 
    isLoading, 
    error,
    totalPages 
  } = useRecords();
  
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const viewPreference = useStore(state => state.viewPreference);
  const setViewPreference = useStore(state => state.setViewPreference);
  
  const toggleView = () => {
    setViewPreference(viewPreference === 'grid' ? 'list' : 'grid');
  };
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-error">{error}</p>
      </div>
    );
  }
  
  return (
    <div>
      <TopLayout />
      <main className="container mx-auto px-4 py-8 mt-16">
        <h1 className="text-2xl font-semibold mb-8">{t('app.browse_records')}</h1>

        {/* Active Filters - Always visible on mobile */}
        <div className="block lg:hidden mb-4">
          <ActiveFilters />
        </div>

        <div className="lg:grid lg:grid-cols-4 gap-6">
          {/* Left Column - Price and Condition Filters - Hidden on Mobile */}
          <div className="hidden lg:block lg:col-span-1 mb-6 lg:mb-0">
            <div className="space-y-4 lg:sticky lg:top-4">
              <FilterCard title={t('price.title', { ns: 'filters' })}>
                <PriceRangeFilter />
              </FilterCard>
              <FilterCard title={t('conditions.title', { ns: 'filters' })}>
                <ConditionFilter />
              </FilterCard>
            </div>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-3">
            {/* Filters on Desktop (Includes Active Filters) */}
            <div className="hidden lg:block space-y-4 mb-6 lg:sticky lg:top-4 bg-background z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FilterCard title={t('artists.title', { ns: 'filters' })}>
                  <ArtistFilter />
                </FilterCard>
                <FilterCard title={t('labels.title', { ns: 'filters' })}>
                  <LabelFilter />
                </FilterCard>
                <FilterCard title={t('styles.title', { ns: 'filters' })}>
                  <StyleFilter />
                </FilterCard>
              </div>
              {/* Active Filters - Only visible on desktop inside this section */}
              <ActiveFilters />
            </div>

            <Suspense fallback={<RecordGrid records={[]} loading={true} viewPreference={viewPreference} />}>
              <RecordGrid records={releases} loading={isLoading} viewPreference={viewPreference} />
            </Suspense>
          </div>
        </div>

        {/* Floating Buttons for Mobile */}
        <div className="fixed bottom-4 right-2 sm:bottom-6 sm:right-6 flex flex-col gap-2 sm:gap-4">
          <Button
            variant="default"
            size="icon"
            onClick={() => setFilterSheetOpen(true)}
            className="lg:hidden rounded-full shadow-lg"
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={toggleView}
            className="rounded-full shadow-lg"
          >
            {viewPreference === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
        </div>

        <FilterSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen} />
      </main>
    </div>
  );
}
