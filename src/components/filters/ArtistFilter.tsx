import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterModal } from './FilterModal';
import { useStore } from '@/store';
import { useFilters } from '@/hooks/useFilters';  // Import directly from source
import { useMetadata } from '@/hooks/useMetadata'; // Import directly from source

export function ArtistFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const artists = useFilters((state) => state.artists);
  const setArtists = useFilters((state) => state.setArtists);
  const { metadata, loading: metadataLoading } = useMetadata();
  const uniqueArtists = metadata.artists.sort();

  if (metadataLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 mb-2" />
        <Button variant="outline" className="w-full" disabled>
          Loading Artists...
        </Button>
      </div>
    );
  }

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