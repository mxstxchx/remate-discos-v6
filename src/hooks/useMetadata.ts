import { useState, useEffect } from 'react';
import { sqlToRest, postgrestRequest } from '@/lib/api';

const APP_LOG = '[APP:metadata]';

interface Metadata {
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
        const { method, path } = await sqlToRest({
          sql: `
            SELECT
              ARRAY_AGG(DISTINCT artist_name) as artists,
              ARRAY_AGG(DISTINCT label_name) as labels,
              ARRAY_AGG(DISTINCT style) as styles
            FROM (
              SELECT
                jsonb_array_elements(artists)->>'name' as artist_name,
                jsonb_array_elements(labels)->>'name' as label_name,
                unnest(styles) as style
              FROM releases
            ) as expanded
            WHERE
              artist_name IS NOT NULL
              AND label_name IS NOT NULL
              AND style IS NOT NULL
          `
        });

        console.log(`${APP_LOG} Making API request with:`, { method, path });
        const result = await postgrestRequest({ method, path });
        
        if (result?.[0]) {
          console.log(`${APP_LOG} Received metadata:`, result[0]);
          setMetadata({
            artists: result[0].artists || [],
            labels: result[0].labels || [],
            styles: result[0].styles || []
          });
        }
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