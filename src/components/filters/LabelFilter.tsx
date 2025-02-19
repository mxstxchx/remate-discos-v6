import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';

export function LabelFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useFilters();
  const labels = useFilters((state) => state.labels);
  const setLabels = useFilters((state) => state.setLabels);

  useEffect(() => {
    console.log('[FILTER_DYNAMIC_OPTIONS] LabelFilter - Fetching available labels');
    async function fetchLabels() {
      try {
        setIsLoading(true);
        setError(null);
        const options = await filters.getFilteredOptions('labels');
        console.log('[FILTER_DYNAMIC_OPTIONS] LabelFilter - Received options:', options);
        setAvailableLabels(options);
      } catch (err) {
        console.error('[FILTER_DYNAMIC_OPTIONS] LabelFilter - Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLabels();
  }, [
    filters.artists,
    filters.styles,
    filters.conditions
    // Excluding labels as we don't want to refetch when labels change
  ]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Labels...</span>
        </div>
        <Button variant="outline" className="w-full" disabled>
          Select Labels
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-destructive">
          Error loading labels: {error}
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
          {labels.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className={!availableLabels.includes(label) ? 'opacity-50' : ''}
            >
              {label}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading || availableLabels.length === 0}
        >
          Select Labels ({availableLabels.length})
        </Button>
      </div>

      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Labels"
        options={availableLabels}
        selectedValues={labels}
        onApply={(newLabels) => {
          console.log('[FILTER_DYNAMIC_OPTIONS] LabelFilter - Applying new labels:', newLabels);
          setLabels(newLabels);
        }}
        loading={isLoading}
        category="labels"
      />
    </>
  );
}