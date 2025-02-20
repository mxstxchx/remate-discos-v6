import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ActionButton } from './ActionButton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import type { Release } from '@/store/recordsSlice';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import YouTube from 'react-youtube';

// Extract video ID from YouTube URL
const getVideoId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/);
  return match ? match[1] : '';
};

interface RecordDetailProps {
  id: number;
}

export function RecordDetail({ id }: RecordDetailProps) {
  const [record, setRecord] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchRecord() {
      try {
        const { data, error } = await supabase
          .from('releases')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRecord(data);
      } catch (err) {
        console.error('Error fetching record:', err);
        setError('Failed to load record details');
      } finally {
        setLoading(false);
      }
    }

    fetchRecord();
  }, [id, supabase]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error || !record) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error || 'Record not found'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
      {/* Left Column - 40% */}
      <div className="md:col-span-2">
        <div className="aspect-square relative rounded-lg overflow-hidden">
          <Image
            src={record.primary_image || record.thumb}
            alt={record.title}
            fill
            className="object-contain"
            priority
          />
        </div>
        {/* Mobile ActionButton */}
        <div className="mt-4 md:hidden">
          <ActionButton
            recordId={record.id}
            className="w-full"
          />
        </div>
      </div>

      {/* Right Column - 60% */}
      <div className="md:col-span-3 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{record.title}</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            {record.artists.map((artist, index) => (
              <Badge key={index} variant="secondary">
                {typeof artist === 'string' ? artist : artist.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Condition</p>
            <p className="font-medium">{record.condition}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="font-mono text-xl">€{record.price.toFixed(2)}</p>
          </div>
          {record.year && (
            <div>
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="font-medium">{record.year}</p>
            </div>
          )}
          {record.country && (
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <p className="font-medium">{record.country}</p>
            </div>
          )}
        </div>

        {record.notes && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Notes</p>
            <p className="text-sm">{record.notes}</p>
          </div>
        )}

        {/* Tracklist and Videos Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tracklist */}
          {record.tracklist && record.tracklist.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tracklist</p>
              <div className="space-y-1">
                {record.tracklist.map((track, index) => (
                  <div key={index} className="flex text-sm">
                    <span className="w-10 text-muted-foreground">{track.position}</span>
                    <span>{track.title}</span>
                    {track.duration && (
                      <span className="ml-auto text-muted-foreground">{track.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos Section */}
          {record.videos && record.videos.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">Videos</p>
                {record.videos.length > 1 && (
                  <span className="text-xs text-muted-foreground">Scroll for more →</span>
                )}
              </div>
              <div className="relative">
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  <div className="flex gap-3">
                    {record.videos.map((video, index) => (
                      <div key={index} className="w-[180px] flex-none">
                        <div className="aspect-video rounded-md overflow-hidden">
                          <YouTube
                            videoId={getVideoId(video.url)}
                            className="w-full h-full"
                            opts={{
                              width: '100%',
                              height: '100%',
                              playerVars: {
                                autoplay: 0,
                                modestbranding: 1,
                                rel: 0
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {record.videos.length > 1 && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Action Button */}
        <div className="pt-4 hidden md:block">
          <ActionButton
            recordId={record.id}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}