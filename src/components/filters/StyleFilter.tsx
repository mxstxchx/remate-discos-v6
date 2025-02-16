import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';
import { useStore } from '@/store';

export function StyleFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const styles = useFilters((state) => state.styles);
  const setStyles = useFilters((state) => state.setStyles);
  const releases = useStore((state) => state.releases);

  const { metadata, loading: metadataLoading } = useMetadata();
  const uniqueStyles = metadata.styles.sort();

  if (metadataLoading) {
    return (
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded animate-pulse mb-2" />
        <Button variant="outline" className="w-full" disabled>
          Loading Styles...
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <Badge key={style} variant="secondary">
              {style}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsModalOpen(true)}
        >
          Select Styles
        </Button>
      </div>

      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Styles"
        options={uniqueStyles}
        selectedValues={styles}
        onApply={setStyles}
      />
    </>
  );
}