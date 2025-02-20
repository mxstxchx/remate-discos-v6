import { useState } from 'react';
import YouTube from 'react-youtube';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Video {
  url: string;
  title: string;
}

interface VideoCarouselProps {
  videos: Video[];
}

export function VideoCarousel({ videos }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract video ID from YouTube URL
  const getVideoId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/);
    return match ? match[1] : '';
  };

  const handlePrevious = () => {
    setCurrentIndex((current) => (current === 0 ? videos.length - 1 : current - 1));
  };

  const handleNext = () => {
    setCurrentIndex((current) => (current === videos.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-video">
        <YouTube
          videoId={getVideoId(videos[currentIndex].url)}
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
        
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={handlePrevious}
            className="rounded-full bg-black/50 hover:bg-black/70"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            onClick={handleNext}
            className="rounded-full bg-black/50 hover:bg-black/70"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-sm text-center text-muted-foreground">
        {videos[currentIndex].title}
      </p>
    </div>
  );
}