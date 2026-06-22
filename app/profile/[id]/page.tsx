import { Suspense } from 'react';
import ProfileClient from './profile-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: 'वापरकर्ता प्रोफाइल - डिजिटल पंढरपूर',
    description: `वापरकर्ता प्रोफाइल आणि योगदाने - डिजिटल पंढरपूर`,
    openGraph: {
      title: 'वापरकर्ता प्रोफाइल',
      locale: 'mr_IN',
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Suspense fallback={<div className="text-center py-16 text-muted-foreground">लोड होत आहे...</div>}>
        <ProfileClient userId={id} />
      </Suspense>
    </div>
  );
}
