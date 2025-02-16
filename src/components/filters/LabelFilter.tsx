import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';
import { useStore } from '@/store';

export function LabelFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { labels, setLabels } = useFilters();
  const releases = useStore((state) => state.releases);

  // Extract unique labels from releases
  const uniqueLabels = Array.from(
    new Set(
      releases?.flatMap((release) =>
        release?.labels?.map((label) => label?.name)
      ).filter(Boolean) ?? []
    )
  ).sort();

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