import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';

export function StyleFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useFilters();
  const styles = useFilters((state) => state.styles);
  const setStyles = useFilters((state) => state.setStyles);

  useEffect(() => {
    console.log('[FILTER_DYNAMIC_OPTIONS] StyleFilter - Fetching available styles');
    async function fetchStyles() {
      try {
        setIsLoading(true);
        setError(null);
        const options = await filters.getFilteredOptions('styles');
        console.log('[FILTER_DYNAMIC_OPTIONS] StyleFilter - Received options:', options);
        setAvailableStyles(options);
      } catch (err) {
        console.error('[FILTER_DYNAMIC_OPTIONS] StyleFilter - Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStyles();
  }, [
    filters.artists,
    filters.labels,
    filters.conditions,
    // Excluding styles as we don't want to refetch when styles change
  ]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Styles...</span>
        </div>
        <Button variant="outline" className="w-full" disabled>
          Select Styles
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-destructive">
          Error loading styles: {error}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <Badge
              key={style}
              variant="secondary"
              className={!availableStyles.includes(style) ? 'opacity-50' : ''}
            >
              {style}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading || availableStyles.length === 0}
        >
          Select Styles ({availableStyles.length})
        </Button>
      </div>

      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Styles"
        options={availableStyles}
        selectedValues={styles}
        onApply={(newStyles) => {
          console.log('[FILTER_DYNAMIC_OPTIONS] StyleFilter - Applying new styles:', newStyles);
          setStyles(newStyles);
        }}
        loading={isLoading}
        category="styles"
      />
    </>
  );
}