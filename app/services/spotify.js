import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// yea this is a mess

const clientId = '511ca4811dce4f82a326e93d7c176d10';
const redirectUri = Platform.OS === 'web' ? 'http://127.0.0.1:8081/callback' : AuthSession.makeRedirectUri({ useProxy: true }); //'odd1out://callback';
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
    if (Platform.OS !== 'web') {
        await mobileAuth();
        return;
    }
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

async function setToken(t) {
    await AsyncStorage.setItem("spotify-token", t);
}

export async function handleSpotifyCallback(url, onComplete = null) {
    if (Platform.OS !== 'web') {
        return;
    }
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
export async function getTracks(num = null) {
    return getTopTracks(num).then(data => {
        if (data === null) {
            return [];
        }
        for (item of data.items) {
            let entry = {
                name: item["album"]["name"],
                artist: [],
                image: item["album"]["images"][0]["url"],
                id: item["id"],
                // <iframe src="https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC" width="300" height="80" 
                //   frameborder="0" allowtransparency="true" allow="encrypted-media"> </iframe>
            };
            for (artist of item["artists"]) {
                entry.artist.push(artist["name"]);
            }
        }
    })
}

async function getTopTracks(num = null) {
    const token = await AsyncStorage.getItem("spotify-token");
    if (!token) return null;
    let limit = num ? `&limit=${num}` : "";

    return fetch('https://api.spotify.com/v1/me/top/tracks' + limit, {
        headers: { Authorization: `Bearer ${token}` },
    })
        .then(res => res.json())
        .then(tracks => tracks.json());
}

const config = {
    clientId: clientId,
    redirectUri: redirectUri,
    scopes: ['user-read-email', 'playlist-read-private'],
    responseType: 'code',
};

const serviceConfiguration = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

async function mobileAuth() {
    const request = new AuthSession.AuthRequest(config);
    let a = await request.promptAsync(serviceConfiguration);

    if (a.params.code) {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
                clientId,
                code: a.params.code,
                redirectUri,
                extraParams: { code_verifier: request.codeVerifier },
            },
            serviceConfiguration
        );
        // console.log('access token:', tokenResponse.accessToken);
        await setToken(tokenResponse.accessToken);
        // now you can setToken(tokenResponse.accessToken)
    }
}
