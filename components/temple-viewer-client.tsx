'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

const TempleViewer3D = dynamic(
  () => import('./3d/temple-viewer').then((mod) => mod.TempleViewer),
  { 
    ssr: false, 
    loading: () => <div className="w-full h-full bg-saffron/5 animate-pulse rounded-2xl min-h-[300px]" /> 
  }
);

export function TempleViewerClient() {
  return <TempleViewer3D />;
}
export default TempleViewerClient;
