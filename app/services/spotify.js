import { AuthRequest, exchangeCodeAsync, makeRedirectUri, refreshAsync } from "expo-auth-session";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export function saveValue(key, value) {
    if (Platform.OS === "web") {
        localStorage.setItem(key, value);
    } else {
        SecureStore.setItem(key, value);
    }
}

export function getValue(key) {
    if (Platform.OS === "web") {
        return localStorage.getItem(key);
    } else {
        return SecureStore.getItem(key);
    }
}

export function deleteValue(key) {
    if (Platform.OS === "web") {
        localStorage.removeItem(key);
    } else {
        SecureStore.deleteItem(key);
    }
}

export async function saveValueAsync(key, value) {
    if (Platform.OS === "web") {
        localStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value)
    }
}

export async function getValueAsync(key) {
    if (Platform.OS === "web") {
        return localStorage.getItem(key);
    } else {
        return await SecureStore.getItemAsync(key)
    }
}

export async function deleteValueAsync(key) {
    if (Platform.OS === "web") {
        localStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key)
    }
}


////////////////// AUTH //////////////////

const clientId = '511ca4811dce4f82a326e93d7c176d10';
const redirectUri = makeRedirectUri({ useProxy: true, path: "/settings" }).replace('http://localhost', 'http://127.0.0.1');
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

    if (Platform.OS !== "web") {
        const result = await request.promptAsync(discovery);
        if (result.type !== 'success') return false;
        return await exchangeCodeStepAsync(result.params.code, request.codeVerifier);
    }

    window.location.href = await request.makeAuthUrlAsync(discovery);
    saveValue("web-spotify-code-verifier", request.codeVerifier);
    saveValue("web-spotify-auth-state", request.state);
    return;
}

export async function webGetSpotifyToken() {
    if (Platform.OS !== "web") return false;

    const code_verifier = getValue("web-spotify-code-verifier");
    const state = getValue("web-spotify-auth-state");
    deleteValue("web-spotify-code-verifier");
    deleteValue("web-spotify-auth-state");
    if (!code_verifier || !state) return false;

    // get code from url
    const result = new AuthRequest({ state, redirectUri }).parseReturnUrl(window.location.href);
    if (result.type !== 'success') return false;

    return await exchangeCodeStepAsync(result.params.code, code_verifier);
}

async function exchangeCodeStepAsync(code, code_verifier) {
    const tokenResponse = await exchangeCodeAsync({
        clientId,
        code,
        redirectUri,
        extraParams: { code_verifier },
    }, discovery);

    if (!tokenResponse.accessToken) {
        return false;
    }

    await Promise.all([
        saveValueAsync("spotify-token", tokenResponse.accessToken),
        saveValueAsync("spotify-refresh-token", tokenResponse.refreshToken),
        saveValueAsync("spotify-token-expire-date", String(Date.now() / 1000 + tokenResponse.expiresIn)),
    ]);
    return true;
}


export async function clearSpotifyToken() {
    await Promise.all([
        deleteValueAsync("spotify-token"),
        deleteValueAsync("spotify-refresh-token"),
        deleteValueAsync("spotify-token-expire-date"),
    ]);
}

/** returns the number of seconds until the token expires */
export function checkTokenStatus() {
    const expires_at = getValue("spotify-token-expire-date")
    if (!expires_at) return -1;
    return Number(expires_at) - Date.now() / 1000;
}

/** returns true on success */
export async function refreshToken() {
    const refresh_token = getValue("spotify-refresh-token")
    if (!refresh_token) return false;

    const tokenResponse = await refreshAsync({
        clientId,
        refreshToken: refresh_token,
    }, discovery)

    if (!tokenResponse.accessToken) {
        return false;
    }

    await Promise.all([
        saveValueAsync("spotify-token", tokenResponse.accessToken),
        saveValueAsync("spotify-token-expire-date", String(Date.now() / 1000 + tokenResponse.expiresIn)),
        tokenResponse.refreshToken
            ? saveValueAsync("spotify-refresh-token", tokenResponse.refreshToken)
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
        return getValue("spotify-token");
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
