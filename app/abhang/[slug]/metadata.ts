import { type Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // In real implementation, fetch from database
  const title = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${title} - डिजिटल पंढरपूर`,
    description: `मराठी भक्ती साहित्याचा अभंग - ${title}`,
    openGraph: {
      title,
      description: `डिजिटल पंढरपूर वर ${title} वाचा`,
      type: 'article',
      locale: 'mr_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `डिजिटल पंढरपूर वर ${title} वाचा`,
    },
  };
}