import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://haehwadang.com'; // Replace with actual domain from env if needed

    // Static routes
    const routes = [
        '',
        '/auth/login',
        '/auth/register',
        '/protected',
        '/protected/analysis',
        '/protected/membership',
        '/protected/profile',
        '/protected/saju/manse',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    return routes;
}
