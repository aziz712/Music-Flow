"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "../ui/Button";
import { Song } from "@/types";
import { BASE_API_URL } from "@/services/api";

interface BulkDownloadButtonProps {
    selectedSongs: Song[];
    onDownloadComplete?: () => void;
}

export default function BulkDownloadButton({ selectedSongs, onDownloadComplete }: BulkDownloadButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDownload = async () => {
        if (selectedSongs.length === 0) return;

        setIsLoading(true);
        setProgress(10); // Start progress

        try {
            // Transform songs to format expected by backend
            const songsPayload = selectedSongs.map(song => ({
                title: song.title,
                artist: song.artist.name,
                downloadUrl: song.link || song.preview || ""
            }));

            const response = await fetch(`${BASE_API_URL}/download/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ songs: songsPayload }),
            });

            if (!response.ok) throw new Error("Bulk download failed");

            setProgress(50); // Downloading zip

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "songs.zip";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setProgress(100);
            if (onDownloadComplete) onDownloadComplete();

        } catch (error) {
            console.error("Bulk download error:", error);
            alert("Failed to download ZIP");
        } finally {
            setIsLoading(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    if (selectedSongs.length === 0) return null;

    return (
        <div className="fixed bottom-24 right-4 z-50 animate-in slide-in-from-bottom-4">
            <Button
                onClick={handleDownload}
                className="shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2 pr-6 pl-4 h-12 rounded-full transition-all"
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Download className="w-5 h-5" />
                )}
                <span className="font-semibold">
                    {isLoading ? "Compressing..." : `Download ${selectedSongs.length} Songs`}
                </span>

                {isLoading && (
                    <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full overflow-hidden rounded-b-full">
                        <div
                            className="h-full bg-white/60 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </Button>
        </div>
    );
}
