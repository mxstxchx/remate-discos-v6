import { useState, useEffect } from 'react';

export interface Metadata {
  artists: string[];
  labels: string[];
  styles: string[];
}

async function fetchMetadata() {
  console.log('[METADATA] Fetching metadata...');
  // Request all records without pagination
  const response = await fetch('/api/postgrest/releases?select=artists,labels,styles');
  console.log('[METADATA] Response status:', response.status);
  if (!response.ok) throw new Error('Failed to fetch metadata');
 
  const { data: records } = await response.json();
  console.log('[METADATA] Records fetched:', records.length);
  
  const artists = new Set<string>();
  const labels = new Set<string>();
  const styles = new Set<string>();
 
  console.log('[METADATA] Processing records...');
  
  records.forEach((record: any) => {
    try {
      // Parse artists JSON and extract names
      const artistData = typeof record.artists === 'string'
        ? JSON.parse(record.artists)
        : record.artists;
        
      if (Array.isArray(artistData)) {
        artistData.forEach(artist => {
          if (typeof artist === 'string') {
            artists.add(artist);
          } else if (artist?.name) {
            artists.add(artist.name);
          }
        });
      }
 
      // Parse labels JSON and extract names
      const labelData = typeof record.labels === 'string'
        ? JSON.parse(record.labels)
        : record.labels;
        
      if (Array.isArray(labelData)) {
        labelData.forEach(label => {
          if (label?.name) {
            labels.add(label.name);
          }
        });
      }
 
      // Parse styles JSON
      const styleData = typeof record.styles === 'string'
        ? JSON.parse(record.styles)
        : record.styles;
        
      if (Array.isArray(styleData)) {
        styleData.forEach(style => {
          if (style) styles.add(style);
        });
      }
    } catch (error) {
      console.error('[METADATA] Error processing record:', error);
    }
  });

  const metadata = {
    artists: Array.from(artists).sort(),
    labels: Array.from(labels).sort(),
    styles: Array.from(styles).sort()
  };

  console.log('[METADATA] Processed metadata:', {
    artistsCount: metadata.artists.length,
    labelsCount: metadata.labels.length,
    stylesCount: metadata.styles.length
  });

  return metadata;
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
      .catch(err => {
        console.error('[METADATA] Error:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return { metadata, loading, error };
}