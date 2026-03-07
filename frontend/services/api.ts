import axios from 'axios';
import { Song } from '@/types';

export const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production'
        ? 'https://music-flow-uww7.onrender.com/api'
        : 'http://localhost:5000/api');

const API_URL = BASE_API_URL;

import { useAuthStore } from '@/store/authStore';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const searchSongs = async (query: string): Promise<Song[]> => {
    const response = await api.get('/songs/search', { params: { q: query } });
    return response.data;
};

export const getTrendingSongs = async (): Promise<Song[]> => {
    const response = await api.get('/songs/trending');
    return response.data;
};

export const getRecommendations = async (): Promise<Song[]> => {
    const response = await api.get('/songs/recommendations');
    return response.data;
};

export const trackHistory = async (songId: string): Promise<void> => {
    await api.post('/users/history', { songId });
};

export const toggleFavorite = async (songId: string): Promise<string[]> => {
    const response = await api.post('/users/favorites', { songId });
    return response.data.favorites;
};

export const bulkSearchSongs = async (queries: string[]): Promise<Song[]> => {
    const response = await api.post('/songs/bulk', { songs: queries });
    return response.data;
};

export const getSongDetails = async (id: number | string): Promise<Song> => {
    const response = await api.get(`/songs/${id}`);
    return response.data;
};

export const getSimilarSongs = async (id: number | string): Promise<Song[]> => {
    const response = await api.get(`/songs/similar/${id}`);
    return response.data;
};
export const getPlaylistById = async (id: string): Promise<any> => {
    const response = await api.get(`/playlists/${id}`);
    return response.data;
};

export const getUserPlaylists = async (): Promise<any[]> => {
    const response = await api.get('/playlists/my');
    return response.data;
};

export const createPlaylist = async (data: { name: string; description?: string; isPublic?: boolean }): Promise<any> => {
    const response = await api.post('/playlists', data);
    return response.data;
};

export const deletePlaylist = async (id: string): Promise<void> => {
    await api.delete(`/playlists/${id}`);
};

export const getFavoriteSongs = async (): Promise<Song[]> => {
    const response = await api.get('/users/favorites');
    return response.data;
};

export const updateSettings = async (data: { name?: string; email?: string; password?: string }): Promise<any> => {
    const response = await api.put('/users/settings', data);
    return response.data;
};

// Security
export const changePassword = async (data: any) => {
    const response = await api.post('/security/change-password', data);
    return response.data;
};

export const setup2FA = async () => {
    const response = await api.post('/security/2fa/setup');
    return response.data;
};

export const verify2FA = async (token: string) => {
    const response = await api.post('/security/2fa/verify', { token });
    return response.data;
};

export const getSecuritySessions = async () => {
    const response = await api.get('/security/sessions');
    return response.data;
};

export const logoutSession = async (sessionId: string) => {
    const response = await api.delete(`/security/sessions/${sessionId}`);
    return response.data;
};

// Notifications
export const getNotifications = async (page = 1) => {
    const response = await api.get('/notifications', { params: { page } });
    return response.data;
};

export const markNotificationRead = async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
};

export const updateNotificationPreferences = async (data: any) => {
    const response = await api.put('/notifications/preferences', data);
    return response.data;
};

// Subscriptions
export const createSubscriptionCheckout = async (planId: string) => {
    const response = await api.post('/subscription/checkout', { planId });
    return response.data;
};

// Interaction Tracking
export const trackInteraction = async (data: { songId: string; action: string; duration?: number; metadata?: any }) => {
    await api.post('/songs/interaction', data);
};

// Delete Account
export const deleteAccount = async (password: string) => {
    const response = await api.delete('/users/profile', { data: { password } });
    return response.data;
};
