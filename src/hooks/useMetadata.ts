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
        const { method, path } = await sqlToRest({
          sql: `
            SELECT
              COALESCE(
                (SELECT array_agg(DISTINCT name)
                FROM releases, jsonb_array_elements(artists) AS a,
                jsonb_to_record(a) AS x(name text)
                WHERE name IS NOT NULL),
                ARRAY[]::text[]
              ) as artists,
              COALESCE(
                (SELECT array_agg(DISTINCT name)
                FROM releases, jsonb_array_elements(labels) AS l,
                jsonb_to_record(l) AS x(name text)
                WHERE name IS NOT NULL),
                ARRAY[]::text[]
              ) as labels,
              COALESCE(
                (SELECT array_agg(DISTINCT unnest(styles))
                FROM releases
                WHERE styles IS NOT NULL),
                ARRAY[]::text[]
              ) as styles
          `
        });

        console.log(`${APP_LOG} Making API request:`, { method, path });
        const result = await postgrestRequest({ method, path });
        console.log(`${APP_LOG} Received raw result:`, result);

        if (result?.[0]) {
          const metadataResult = {
            artists: (result[0].artists || []).sort(),
            labels: (result[0].labels || []).sort(),
            styles: (result[0].styles || []).sort()
          };

          console.log(`${APP_LOG} Processed metadata:`, {
            artistsCount: metadataResult.artists.length,
            labelsCount: metadataResult.labels.length,
            stylesCount: metadataResult.styles.length
          });

          setMetadata(metadataResult);
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