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
        // First get unique artists
        const artistsQuery = await sqlToRest({
          sql: `
            SELECT DISTINCT jsonb_path_query_array(artists, '$[*].name') as names
            FROM releases
          `
        });

        // Then get unique labels
        const labelsQuery = await sqlToRest({
          sql: `
            SELECT DISTINCT jsonb_path_query_array(labels, '$[*].name') as names
            FROM releases
          `
        });

        // Finally get unique styles
        const stylesQuery = await sqlToRest({
          sql: `
            SELECT DISTINCT styles as names
            FROM releases
          `
        });

        console.log(`${APP_LOG} Making API requests for metadata`);
        
        const [artistsResult, labelsResult, stylesResult] = await Promise.all([
          postgrestRequest({ method: 'GET', path: artistsQuery.path }),
          postgrestRequest({ method: 'GET', path: labelsQuery.path }),
          postgrestRequest({ method: 'GET', path: stylesQuery.path })
        ]);

        console.log(`${APP_LOG} Processing metadata results`);

        // Process and flatten arrays
        const artists = Array.from(new Set(
          artistsResult?.flatMap(r => r.names || [])
        )).filter(Boolean).sort();

        const labels = Array.from(new Set(
          labelsResult?.flatMap(r => r.names || [])
        )).filter(Boolean).sort();

        const styles = Array.from(new Set(
          stylesResult?.flatMap(r => r.names || [])
        )).filter(Boolean).sort();

        console.log(`${APP_LOG} Setting metadata:`, {
          artistsCount: artists.length,
          labelsCount: labels.length,
          stylesCount: styles.length
        });

        setMetadata({
          artists,
          labels,
          styles
        });
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