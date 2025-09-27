

import { handleSpotifyCallback } from '../services/spotify';

export default function callback(event, context) {
    // web only page
    const currentUrl = window.location.href;
    handleSpotifyCallback(currentUrl);//, () => { window.location.href = '/' });

    return (
        <>
        </>
    )
};
