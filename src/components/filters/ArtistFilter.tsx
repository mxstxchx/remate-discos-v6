import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';
import { useMetadata } from '@/hooks/useMetadata';

export function ArtistFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const artists = useFilters((state) => state.artists);
  const setArtists = useFilters((state) => state.setArtists);
  const { metadata, loading: metadataLoading, error } = useMetadata();

  // Safely access and sort artists from metadata
  const uniqueArtists = metadata?.artists?.sort() ?? [];

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

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Error loading artists.</p>
        <Button variant="outline" className="w-full" disabled>
          Try Again
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
          Select Artists ({uniqueArtists.length})
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