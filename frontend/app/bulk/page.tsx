"use client";

import { useState } from "react";
import { bulkSearchSongs } from "@/services/api";
import { Song } from "@/types";
import SongCard from "@/components/song/SongCard";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import BulkDownloadButton from "@/components/ui/BulkDownloadButton";

export default function BulkSearchPage() {
    const [input, setInput] = useState("");
    const [results, setResults] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);

    const handleBulkSearch = async () => {
        const queries = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        if (queries.length === 0) return;

        setLoading(true);
        try {
            const data = await bulkSearchSongs(queries);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="space-y-4">
                <h1 className="text-3xl font-bold">Bulk Search</h1>
                <p className="text-muted-foreground">Paste a list of songs (one per line) to search effectively.</p>

                <textarea
                    className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Eminem - Lose Yourself&#10;Adele - Hello&#10;Drake - One Dance"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />

                <Button onClick={handleBulkSearch} disabled={loading} size="lg">
                    {loading ? 'Searching...' : 'Search All'}
                </Button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <Loader />
                ) : (
                    results.length > 0 && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {results.map(song => (
                                    <SongCard key={song.id} song={song} />
                                ))}
                            </div>
                            <BulkDownloadButton selectedSongs={results} />
                        </>
                    )
                )}
            </div>
        </div>
    );
}
