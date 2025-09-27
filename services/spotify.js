import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const clientId = '511ca4811dce4f82a326e93d7c176d10';
const redirectUri = Platform.OS === 'web' ? 'http://127.0.0.1:8081/callback' : 'odd1out://callback';
const scopes = 'user-read-private user-read-email';


function getRandomString(length = 128) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


async function generateCodeChallenge(verifier) {
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        verifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/// call this to start the login process, and don't forget to handle the callback
export async function promptSpotifyLogin() {
    let codeVerifier = getRandomString();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    await AsyncStorage.setItem("spotify-code-verifier", codeVerifier);

    const authUrl =
        `https://accounts.spotify.com/authorize` +
        `?client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${await codeChallenge}`;

    Linking.openURL(authUrl);
};

function setToken(t) {
    AsyncStorage.setItem("spotify-token", t);
}

export async function handleSpotifyCallback(url, onComplete = null) {
    const code = new URL(url).searchParams.get('code');
    // if (!code) return console.log('no code');
    const verifier = await AsyncStorage.getItem("spotify-code-verifier");
    await AsyncStorage.removeItem("spotify-code-verifier");

    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier,
        }),
    })
        .then(res => res.json())
        .then(data => setToken(data.access_token))
        .finally(() => { if (onComplete) { onComplete(); } });
}

export async function getUser() {
    const token = await AsyncStorage.getItem("spotify-token");
    if (!token) return null;

    return fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
    })
        .then(res => res.json())
        .then(profile => profile.json());
}

export async function getTopTracks() {
    const token = await AsyncStorage.getItem("spotify-token");
    if (!token) return null;

    return fetch('https://api.spotify.com/v1/me/top/tracks', {
        headers: { Authorization: `Bearer ${token}` },
    })
        .then(res => res.json())
        .then(tracks => tracks.json());
}
