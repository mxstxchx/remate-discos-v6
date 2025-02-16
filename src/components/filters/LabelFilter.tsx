import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';
import { useMetadata } from '@/hooks/useMetadata';

export function LabelFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const labels = useFilters((state) => state.labels);
  const setLabels = useFilters((state) => state.setLabels);
  const releases = useStore((state) => state.releases);

  const { metadata, loading: metadataLoading } = useMetadata();
  const uniqueLabels = metadata.labels.sort();

  if (metadataLoading) {
    return (
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded animate-pulse mb-2" />
        <Button variant="outline" className="w-full" disabled>
          Loading Labels...
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsModalOpen(true)}
        >
          Select Labels
        </Button>
      </div>

      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Labels"
        options={uniqueLabels}
        selectedValues={labels}
        onApply={setLabels}
      />
    </>
  );
}