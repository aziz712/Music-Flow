const axios = require('axios');

const DEEZER_API_URL = 'https://api.deezer.com';

exports.searchTracks = async (query) => {
    try {
        const response = await axios.get(`${DEEZER_API_URL}/search`, {
            params: { q: query },
        });
        return response.data.data;
    } catch (error) {
        console.error('Deezer API Error:', error.message);
        throw new Error('Failed to fetch songs from Deezer');
    }
};

exports.getTrackDetails = async (id) => {
    try {
        const response = await axios.get(`${DEEZER_API_URL}/track/${id}`);
        return response.data;
    } catch (error) {
        console.error('Deezer API Error:', error.message);
        throw new Error('Failed to fetch track details');
    }
};
