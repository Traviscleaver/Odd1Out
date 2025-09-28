import { AuthRequest, exchangeCodeAsync, makeRedirectUri, refreshAsync } from "expo-auth-session";
import * as SecureStore from 'expo-secure-store';

////////////////// AUTH //////////////////

const clientId = '511ca4811dce4f82a326e93d7c176d10';
const redirectUri = makeRedirectUri({ useProxy: true }).replace('http://localhost', 'http://127.0.0.1');
const scopes = ['user-read-private', 'user-read-email', 'user-top-read'];

const config = {
    clientId,
    redirectUri,
    scopes,
};

const discovery = {
    authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export async function promptSpotifyLogin() {
    const request = new AuthRequest(config);
    // Prompt for an auth code
    const result = await request.promptAsync(discovery);

    if (result.type === 'success') {
        const code = result.params.code;

        const tokenResponse = await exchangeCodeAsync({
            clientId,
            code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier },
        }, discovery);

        if (!tokenResponse.accessToken) {
            return false;
        }

        await Promise.all([
            SecureStore.setItemAsync("spotify-token", tokenResponse.accessToken),
            SecureStore.setItemAsync("spotify-refresh-token", tokenResponse.refreshToken),
            SecureStore.setItemAsync("spotify-token-expire-date", String(Date.now() / 1000 + tokenResponse.expiresIn)),
        ]);

        return true;
    }
    return false;
}

export async function clearSpotifyToken() {
    await Promise.all([
        SecureStore.deleteItemAsync("spotify-token"),
        SecureStore.deleteItemAsync("spotify-refresh-token"),
        SecureStore.deleteItemAsync("spotify-token-expire-date"),
    ]);
}

/** returns the number of seconds until the token expires */
export function checkTokenStatus() {
    const expires_at = SecureStore.getItem("spotify-token-expire-date")
    if (!expires_at) return -1;
    return Number(expires_at) - Date.now() / 1000;
}

/** returns true on success */
export async function refreshToken() {
    const refresh_token = SecureStore.getItem("spotify-refresh-token")
    if (!refresh_token) return false;

    const tokenResponse = await refreshAsync({
        clientId,
        refreshToken: refresh_token,
    }, discovery)

    if (!tokenResponse.accessToken) {
        return false;
    }

    await Promise.all([
        SecureStore.setItemAsync("spotify-token", tokenResponse.accessToken),
        SecureStore.setItemAsync("spotify-token-expire-date", String(Date.now() / 1000 + tokenResponse.expiresIn)),
        tokenResponse.refreshToken
            ? SecureStore.setItemAsync("spotify-refresh-token", tokenResponse.refreshToken)
            : Promise.resolve(),
    ]);

    return true;
}

export async function validateAndRefreshToken() {
    if (checkTokenStatus() < 60 * 10) { // 10 minutes
        return await refreshToken();
    }
    return true;
}

export async function refreshAndGetToken() {
    if (await validateAndRefreshToken()) {
        return SecureStore.getItem("spotify-token");
    }
}

////////////////// GETTERS //////////////////

export async function getUserData(token) {
    if (!token) return null;

    const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
}

async function getTopTracks(token, num = null) {
    if (!token) return null;

    let limit = num != null ? `&limit=${num}` : "";

    const res = await fetch('https://api.spotify.com/v1/me/top/tracks' + limit, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
}

export async function getTracks(token, num = null) {
    const data = await getTopTracks(token, num);

    if (!data || data.error) {
        if (data?.error) console.log("Error fetching top tracks:", data.error);
        return [];
    }

    return data.items.map(item => ({
        artist: item.artists.map(a => a.name),
        id: item.id,
        image: item.album.images[0].url,
        name: item.name,
    }));
}
