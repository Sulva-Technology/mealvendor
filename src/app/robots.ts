import type { MetadataRoute } from 'next';

// Auth-gated vendor portal — no public content to index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
