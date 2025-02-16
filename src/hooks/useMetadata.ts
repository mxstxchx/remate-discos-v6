import { useState, useEffect } from 'react';

export interface Metadata {
  artists: string[];
  labels: string[];
  styles: string[];
}

async function fetchMetadata() {
  // Use proper PostgREST JSON extraction
  const response = await fetch('/api/postgrest/releases?select=artists->name,labels->name,styles');
  if (!response.ok) throw new Error('Failed to fetch metadata');

  const records = await response.json();
  
  const artists = new Set<string>();
  const labels = new Set<string>();
  const styles = new Set<string>();

  records.forEach((record: any) => {
    try {
      const artistsArray = Array.isArray(record.artists) ? record.artists : JSON.parse(record.artists);
      artistsArray?.forEach((artist: any) => {
        if (artist?.name) artists.add(artist.name);
      });

      const labelsArray = Array.isArray(record.labels) ? record.labels : JSON.parse(record.labels);
      labelsArray?.forEach((label: any) => {
        if (label?.name) labels.add(label.name);
      });

      const stylesArray = Array.isArray(record.styles) ? record.styles : JSON.parse(record.styles);
      stylesArray?.forEach((style: string) => {
        if (style) styles.add(style);
      });
    } catch (error) {
      console.error('Error parsing record:', error);
    }
  });

  return {
    artists: Array.from(artists).sort(),
    labels: Array.from(labels).sort(),
    styles: Array.from(styles).sort()
  };
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
    setLoading(true);
    fetchMetadata()
      .then(setMetadata)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { metadata, loading, error };
}