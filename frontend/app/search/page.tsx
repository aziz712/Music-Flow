"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { searchSongs } from "@/services/api";
import { Song } from "@/types";
import SongCard from "@/components/song/SongCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import BulkDownloadButton from "@/components/ui/BulkDownloadButton";
import Loader from "@/components/ui/Loader";

export default function SearchPage() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);

    const toggleSelection = (song: Song) => {
        setSelectedSongs(prev => {
            const exists = prev.find(s => s.id === song.id);
            if (exists) return prev.filter(s => s.id !== song.id);
            return [...prev, song];
        });
    };

    useEffect(() => {
        if (initialQuery) {
            performSearch(initialQuery);
        }
    }, [initialQuery]);

    const performSearch = async (q: string) => {
        setLoading(true);
        try {
            const data = await searchSongs(q);
            setResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query) performSearch(query);
    };

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl mx-auto">
                <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search..."
                />
                <Button type="submit">Search</Button>
            </form>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Results</h2>
                    {results.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (selectedSongs.length === results.length) {
                                    setSelectedSongs([]);
                                } else {
                                    setSelectedSongs([...results]);
                                }
                            }}
                        >
                            {selectedSongs.length === results.length ? "Deselect All" : "Select All"}
                        </Button>
                    )}
                </div>

                {loading ? (
                    <Loader />
                ) : (
                    results.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {results.map(song => (
                                    <SongCard
                                        key={song.id}
                                        song={song}
                                        isSelected={selectedSongs.some(s => s.id === song.id)}
                                        onToggleSelect={() => toggleSelection(song)}
                                    />
                                ))}
                            </div>
                            <BulkDownloadButton
                                selectedSongs={selectedSongs}
                                onDownloadComplete={() => setSelectedSongs([])}
                            />
                        </>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground">No results found.</div>
                    )
                )}
            </div>
        </div >
    );
}
