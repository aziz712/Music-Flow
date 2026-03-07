export interface Artist {
    id: number;
    name: string;
    picture: string;
    picture_small: string;
    picture_medium: string;
    picture_big: string;
    picture_xl: string;
    tracklist: string;
}

export interface Album {
    id: number;
    title: string;
    cover: string;
    cover_small: string;
    cover_medium: string;
    cover_big: string;
    cover_xl: string;
    tracklist: string;
}

export interface Song {
    id: number | string;
    title: string;
    title_short: string;
    title_version: string;
    link: string;
    duration: number;
    rank: number;
    explicit_lyrics: boolean;
    explicit_content_lyrics: number;
    explicit_content_cover: number;
    preview?: string;
    artist: {
        id?: number;
        name: string;
        picture?: string;
    } | Artist;
    album?: {
        id?: number;
        title?: string;
        cover?: string;
        cover_medium?: string;
    } | Album;
    image?: string;
    reason?: string; // For recommendations
    lyrics?: string;
}

export interface User {
    _id: string;
    name: string;
    email: string;
    token?: string;
    isVerified: boolean;
    favorites: string[];
    playlists: string[];
    listeningHistory: string[];
    notificationPreferences: {
        email: boolean;
        productUpdates: boolean;
        weeklyDigest: boolean;
        securityAlerts: boolean;
    };
    subscription: {
        tier: 'free' | 'pro' | 'premium';
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        currentPeriodEnd?: Date;
    };
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}
