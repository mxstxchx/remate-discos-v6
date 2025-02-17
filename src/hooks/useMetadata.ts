import { useState, useEffect } from 'react';

export interface Metadata {
  artists: string[];
  labels: string[];
  styles: string[];
}

async function fetchMetadata() {
  console.log('[METADATA] Fetching metadata...');
  // Use proper PostgREST format for JSONB fields
  const response = await fetch('/api/postgrest/releases?select=artists,labels,styles');
  console.log('[METADATA] Response status:', response.status);
  if (!response.ok) throw new Error('Failed to fetch metadata');
 
  const records = await response.json();
  
  // Debug logs to inspect the data structure
  console.log('First record:', JSON.stringify(records[0], null, 2));
  console.log('Records length:', records.length);
  if (records[0]) {
    console.log('Artists type:', typeof records[0].artists);
    console.log('Artists value:', records[0].artists);
    console.log('Labels type:', typeof records[0].labels);
    console.log('Labels value:', records[0].labels);
    console.log('Styles type:', typeof records[0].styles);
    console.log('Styles value:', records[0].styles);
  }
  
  const artists = new Set<string>();
  const labels = new Set<string>();
  const styles = new Set<string>();
 
  console.log('[METADATA] Processing records:', records.length);
  
  records.forEach((record: any, index: number) => {
    try {
      // Log first few records for debugging
      if (index < 2) {
        console.log(`[METADATA] Record ${index} artists:`, record.artists);
      }

      // Handle artists JSONB field
      if (record.artists) {
        const artistsList = Array.isArray(record.artists) ? record.artists : [record.artists];
        artistsList.forEach((artist: any) => {
          if (artist?.name) {
            artists.add(artist.name);
            if (index < 2) console.log(`[METADATA] Added artist: ${artist.name}`);
          }
        });
      }
 
      if (record.labels) {
        (Array.isArray(record.labels) ? record.labels : [record.labels]).forEach((label: any) => {
          if (label?.name) labels.add(label.name);
        });
      }
 
      if (record.styles) {
        (Array.isArray(record.styles) ? record.styles : [record.styles]).forEach((style: string) => {
          if (style) styles.add(style);
        });
      }
    } catch (error) {
      console.error('Error processing record:', error, record);
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