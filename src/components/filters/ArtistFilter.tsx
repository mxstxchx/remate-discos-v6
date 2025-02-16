import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';
import { useStore } from '@/store';

export function ArtistFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { artists, setArtists } = useFilters();
  const releases = useStore((state) => state.releases);

  // Extract unique artists from releases
  const uniqueArtists = Array.from(
    new Set(
      releases?.flatMap((release) =>
        release?.artists?.map((artist) => artist?.name)
      ).filter(Boolean) ?? []
    )
  ).sort();

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {artists.map((artist) => (
            <Badge key={artist} variant="secondary">
              {artist}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsModalOpen(true)}
        >
          Select Artists
        </Button>
      </div>

      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Artists"
        options={uniqueArtists}
        selectedValues={artists}
        onApply={setArtists}
      />
    </>
  );
}