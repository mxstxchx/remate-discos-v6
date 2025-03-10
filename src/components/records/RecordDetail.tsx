import { useEffect, useState, useRef } from 'react';
import { useRecordStatus } from '@/hooks/useRecordStatus';
import { useCart } from '@/hooks/useCart';
import { useQueue } from '@/hooks/useQueue';
import { Card } from '@/components/ui/card';
import { ActionButton } from './ActionButton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { Release } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

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
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  // Using the singleton supabase client from client.ts
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  // Get record status
  const status = useRecordStatus(id);
  
  // Get cart and queue hooks
  const { addToCart } = useCart();
  const { joinQueue, leaveQueue } = useQueue();

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

  // Function to generate YouTube thumbnail URL
  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  // Handler for clicking a video thumbnail
  const handleVideoClick = (index: number) => {
    setActiveVideoIndex(index);
  };

  // Cart and queue handlers
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addToCart(id);
      console.log('[CART] Added to cart:', id);
    } catch (error) {
      console.error('[CART] Failed to add to cart:', error);
    }
  };

  const handleJoinQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await joinQueue(id);
      console.log('[QUEUE] Joined queue for:', id);
    } catch (error) {
      console.error('[QUEUE] Failed to join queue:', error);
    }
  };

  const handleLeaveQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await leaveQueue(id);
      console.log('[QUEUE] Left queue for:', id);
    } catch (error) {
      console.error('[QUEUE] Failed to leave queue:', id);
    }
  };

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
            src={record.primary_image || record.thumb || '/placeholder-image.jpg'}
            alt={record.title}
            fill
            unoptimized={true}
            className="object-contain"
            priority
          />
        </div>
        {/* Mobile ActionButton */}
        <div className="mt-4 md:hidden">
          <ActionButton
            recordId={record.id}
            status={status}
            onAddToCart={handleAddToCart}
            onJoinQueue={handleJoinQueue}
            onLeaveQueue={handleLeaveQueue}
            recordTitle={record.title}
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
                {typeof artist === 'string' ? artist : 'name' in artist ? artist.name : String(artist)}
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
                {record.tracklist.map((track: any, index: number) => (
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

          {/* Videos Section - Optimized with thumbnails */}
          {record.videos && Array.isArray(record.videos) && record.videos.length > 0 && (
            <div ref={videoContainerRef}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">Videos</p>
                {Array.isArray(record.videos) && record.videos.length > 1 && (
                  <span className="text-xs text-muted-foreground">Scroll for more →</span>
                )}
              </div>
              
              {/* Active Video Player */}
              {activeVideoIndex !== null && (
                <div className="aspect-video rounded-md overflow-hidden mb-4">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${getVideoId(Array.isArray(record.videos) && activeVideoIndex !== null ? record.videos[activeVideoIndex].url : '')}?modestbranding=1&rel=0`}
                    title={Array.isArray(record.videos) && activeVideoIndex !== null ? (record.videos[activeVideoIndex].title || 'Video') : 'Video'}
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              )}
              
              {/* Video Thumbnails */}
              <div className="relative">
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                  <div className="flex gap-3">
                    {Array.isArray(record.videos) && record.videos.map((video, index) => {
                      const videoId = getVideoId(video.url);
                      return (
                        <div 
                          key={index} 
                          className="w-[180px] flex-none cursor-pointer"
                          onClick={() => handleVideoClick(index)}
                        >
                          <div className="aspect-video rounded-md overflow-hidden relative group">
                            <Image
                              src={getYouTubeThumbnail(videoId)}
                              alt={video.title || 'Video thumbnail'}
                              width={180}
                              height={101}
                              className="object-cover w-full h-full"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-10 h-10 text-white" />
                            </div>
                          </div>
                          <p className="text-xs mt-1 truncate">{video.title || 'Play video'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {Array.isArray(record.videos) && record.videos.length > 1 && (
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
            status={status}
            onAddToCart={handleAddToCart}
            onJoinQueue={handleJoinQueue}
            onLeaveQueue={handleLeaveQueue}
            recordTitle={record.title}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}