import { Suspense } from "react";
import SongSlider from "@/components/song/SongSlider";
import HomeHero from "@/components/home/HomeHero";
import FeaturesSection from "@/components/home/FeaturesSection";
import { Song } from "@/types";

import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

async function getTrendingSongs(): Promise<Song[]> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/songs/trending`);
        if (!res.ok) throw new Error('Failed to fetch trending');
        return res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function getRecommendedSongs(): Promise<Song[]> {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get('auth-token')?.value;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/songs/recommendations`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error(`Backend generic recommendations error: ${res.status} ${res.statusText} - ${errText}`);
            throw new Error('Failed to fetch recommendations');
        }
        return res.json();
    } catch (error) {
        console.error("fetch recommendations error:", error);
        return [];
    }
}

export default async function Home() {
    // Parallel fetching on the server
    const [trending, recommended] = await Promise.all([
        getTrendingSongs(),
        getRecommendedSongs()
    ]);

    return (
        <div className="space-y-12 pb-12">
            <HomeHero />

            <div className="space-y-12">
                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-2xl" />}>
                    <SongSlider
                        title="Trending Now"
                        subtitle="Most played tracks across the platform this week."
                        songs={trending}
                    />
                </Suspense>

                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-2xl" />}>
                    <SongSlider
                        title="Recommended Songs"
                        subtitle="AI-curated tracks based on your unique taste."
                        songs={recommended}
                    />
                </Suspense>
            </div>

            <FeaturesSection />
        </div>
    );
}
