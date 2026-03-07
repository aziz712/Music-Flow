import { create } from 'zustand';
import { Song } from '@/types';

interface PlayerState {
    currentSong: Song | null;
    isPlaying: boolean;
    volume: number;
    queue: Song[];
    setCurrentSong: (song: Song) => void;
    togglePlay: () => void;
    setVolume: (vol: number) => void;
    addToQueue: (song: Song) => void;
    setQueue: (songs: Song[]) => void;
    playPlaylist: (songs: Song[], startIndex?: number) => void;
    playNext: () => void;
    playPrev: () => void;
    // Video
    isVideoOpen: boolean;
    videoId: string | null;
    openVideo: (id: string) => void;
    closeVideo: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentSong: null,
    isPlaying: false,
    volume: 1,
    queue: [],
    setCurrentSong: (song) => set({ currentSong: song, isPlaying: true }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setVolume: (vol) => set({ volume: vol }),
    addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
    setQueue: (songs) => set({ queue: songs }),
    playPlaylist: (songs, startIndex = 0) => {
        if (songs.length === 0) return;
        set({
            queue: songs,
            currentSong: songs[startIndex],
            isPlaying: true
        });
    },
    playNext: () => {
        const { queue, currentSong } = get();
        if (!currentSong || queue.length === 0) return;

        const currentIndex = queue.findIndex(s => s.id === currentSong.id);
        const nextIndex = (currentIndex + 1) % queue.length;
        set({ currentSong: queue[nextIndex], isPlaying: true });
    },
    playPrev: () => {
        const { queue, currentSong } = get();
        if (!currentSong || queue.length === 0) return;

        const currentIndex = queue.findIndex(s => s.id === currentSong.id);
        const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
        set({ currentSong: queue[prevIndex], isPlaying: true });
    },

    // Video Modal State
    isVideoOpen: false,
    videoId: null,
    openVideo: (id: string) => set({ isVideoOpen: true, videoId: id, isPlaying: false }), // Pause audio when video starts
    closeVideo: () => set({ isVideoOpen: false, videoId: null }),
}));
