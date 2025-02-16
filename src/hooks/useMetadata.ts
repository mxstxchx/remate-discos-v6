export async function fetchMetadata() {
  const response = await fetch('/api/postgrest/releases?select=artists,labels,styles');
  if (!response.ok) throw new Error('Failed to fetch metadata');

  const records = await response.json();
  
  // Extract unique values
  const artists = new Set<string>();
  const labels = new Set<string>();
  const styles = new Set<string>();

  records.forEach((record: any) => {
    // Handle artists - extract name from each artist object
    record.artists?.forEach((artist: any) => {
      if (artist?.name) artists.add(artist.name);
    });

    // Handle labels - extract name from each label object
    record.labels?.forEach((label: any) => {
      if (label?.name) labels.add(label.name);
    });

    // Handle styles - already an array of strings
    record.styles?.forEach((style: string) => {
      if (style) styles.add(style);
    });
  });

  return {
    artists: Array.from(artists).sort(),
    labels: Array.from(labels).sort(),
    styles: Array.from(styles).sort()
  };
}