'use client';

import { useEffect } from 'react';
import { TopLayout } from '@/components/layout/TopLayout';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { RecordDetail } from '@/components/records/RecordDetail';
import { useStore } from '@/store';

export default function RecordDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const setScrollPosition = useStore(state => state.setScrollPosition);
  
  // Save scroll position before unmounting
  useEffect(() => {
    return () => {
      setScrollPosition(window.scrollY);
    };
  }, [setScrollPosition]);

  return (
    <>
      <TopLayout />
      <main className="pt-16"> {/* Add padding-top to account for TopLayout height */}
        <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go back
      </Button>
      
      <RecordDetail id={parseInt(id as string)} />
        </div>
      </main>
    </>
  );
}