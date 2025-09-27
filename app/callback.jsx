import { useEffect } from 'react';
import { handleSpotifyCallback } from '../services/spotify';
import { Linking, Platform } from 'react-native';

export default function Callback() {
    useEffect(() => {
        if (Platform.OS === 'web') {
            const currentUrl = window.location.href;
            handleSpotifyCallback(currentUrl);
        } else {
            // mobile
            Linking.getInitialURL().then(url => {
                if (url) handleSpotifyCallback(url);
            });

            const subscription = Linking.addEventListener('url', event => {
                handleSpotifyCallback(event.url);
            });

            return () => subscription.remove();
        }
    }, []);

    return <></>;
}
