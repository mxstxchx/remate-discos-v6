import { useState, useEffect } from 'react';
import { sqlToRest, postgrestRequest } from '@/lib/api';

const APP_LOG = '[APP:metadata]';

export interface Metadata {
  artists: string[];
  labels: string[];
  styles: string[];
}

export function useMetadata() {
  const [metadata, setMetadata] = useState<Metadata>({
    artists: [],
    labels: [],
    styles: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      console.log(`${APP_LOG} Fetching metadata`);
      try {
        // Fetch all records first
        const { method, path } = await sqlToRest({
          sql: 'SELECT artists, labels, styles FROM releases'
        });

        console.log(`${APP_LOG} Making API request:`, { method, path });
        const records = await postgrestRequest({ method, path });
        console.log(`${APP_LOG} Received records:`, records?.length);

        // Process the records to extract unique values
        const uniqueArtists = new Set<string>();
        const uniqueLabels = new Set<string>();
        const uniqueStyles = new Set<string>();

        records?.forEach(record => {
          // Process artists
          record.artists?.forEach((artist: any) => {
            if (artist?.name) uniqueArtists.add(artist.name);
          });

          // Process labels
          record.labels?.forEach((label: any) => {
            if (label?.name) uniqueLabels.add(label.name);
          });

          // Process styles
          record.styles?.forEach((style: string) => {
            if (style) uniqueStyles.add(style);
          });
        });

        const metadataResult = {
          artists: Array.from(uniqueArtists).sort(),
          labels: Array.from(uniqueLabels).sort(),
          styles: Array.from(uniqueStyles).sort()
        };

        console.log(`${APP_LOG} Processed metadata:`, {
          artistsCount: metadataResult.artists.length,
          labelsCount: metadataResult.labels.length,
          stylesCount: metadataResult.styles.length,
          sample: {
            artists: metadataResult.artists.slice(0, 3),
            labels: metadataResult.labels.slice(0, 3),
            styles: metadataResult.styles.slice(0, 3)
          }
        });

        setMetadata(metadataResult);
      } catch (err) {
        console.error(`${APP_LOG} Error fetching metadata:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  return { metadata, loading, error };
}