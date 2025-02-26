import { useState, useRef, useEffect } from 'react';
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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  // Lazy load videos when they come into view
  useEffect(() => {
    // Create IntersectionObserver to detect when video is visible
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVideoLoaded(true);
          // Disconnect after loading
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // Load when 10% visible
    );
    
    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []);

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
      <div ref={videoContainerRef} className="relative aspect-video bg-black/20 rounded-lg overflow-hidden">
        {isVideoLoaded ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${getVideoId(videos[currentIndex].url)}?modestbranding=1&rel=0`}
            title={videos[currentIndex].title}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={() => setIsVideoLoaded(true)}
          >
            <div className="text-center">
              <p className="text-sm">Click to load video</p>
              <p className="text-xs text-muted-foreground mt-1">{videos[currentIndex].title}</p>
            </div>
          </div>
        )}
        
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