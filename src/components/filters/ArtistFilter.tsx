import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { FilterModal } from './FilterModal';
import { useFilters } from '@/hooks/useFilters';

export function ArtistFilter() {
  const { t } = useTranslation('filters');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableArtists, setAvailableArtists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useFilters();
  const artists = useFilters((state) => state.artists);
  const setArtists = useFilters((state) => state.setArtists);

  useEffect(() => {
    console.log('[FILTER_DYNAMIC_OPTIONS] ArtistFilter - Fetching available artists');
    async function fetchArtists() {
      try {
        setIsLoading(true);
        setError(null);
        const options = await filters.getFilteredOptions('artists');
        console.log('[FILTER_DYNAMIC_OPTIONS] ArtistFilter - Received options:', options);
        setAvailableArtists(options);
      } catch (err) {
        console.error('[FILTER_DYNAMIC_OPTIONS] ArtistFilter - Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchArtists();
  }, [
    filters.labels,
    filters.styles,
    filters.conditions
    // Excluding artists as we don't want to refetch when artists change
  ]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('artists.loading')}</span>
        </div>
        <Button variant="outline" className="w-full" disabled>
          Select Artists
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-destructive">
          {t('artists.error')}: {error}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {artists.map((artist) => (
            <Badge
              key={artist}
              variant="secondary"
              className={!availableArtists.includes(artist) ? 'opacity-50' : ''}
            >
              {artist}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading || availableArtists.length === 0}
        >
          {t('artists.buttonLabel')} ({availableArtists.length})
        </Button>
      </div>

      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('artists.title')}
        options={availableArtists}
        selectedValues={artists}
        onApply={(newArtists) => {
          console.log('[FILTER_DYNAMIC_OPTIONS] ArtistFilter - Applying new artists:', newArtists);
          setArtists(newArtists);
        }}
        loading={isLoading}
        category="artists"
      />
    </>
  );
}