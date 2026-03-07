const axios = require('axios');

const LYRICS_API_URL = 'https://api.lyrics.ovh/v1';

exports.getLyrics = async (artist, title) => {
    try {
        // Clean up artist/title to maximize hit rate
        const cleanArtist = artist.split(' feat')[0].split(' ft')[0].trim();
        const cleanTitle = title.split(' (')[0].split(' -')[0].trim();

        const response = await axios.get(`${LYRICS_API_URL}/${cleanArtist}/${cleanTitle}`);
        return response.data.lyrics;
    } catch (error) {
        
        return null; // Return null instead of throwing errors for lyrics, as they are often missing
    }
};
