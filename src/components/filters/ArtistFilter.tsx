import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterModal } from './FilterModal';
import { useMetadata } from '@/hooks';
import { useStore } from '@/store';

export function ArtistFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const artists = useFilters((state) => state.artists);
  const setArtists = useFilters((state) => state.setArtists);
  const releases = useStore((state) => state.releases);

  const { metadata, loading: metadataLoading } = useMetadata();
  const uniqueArtists = metadata.artists.sort();

  if (metadataLoading) {
    return (
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded animate-pulse mb-2" />
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