export function generateGameCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getRandomTrack(players) {
  if (!players || Object.keys(players).length === 0) {
    // No players provided
    return null;
  }

  const tracks = [];

  for (const playerData of Object.values(players)) {
    if (playerData?.topTracks && Array.isArray(playerData.topTracks)) {
      tracks.push(...playerData.topTracks);
    }
  }

  if (tracks.length === 0) {
    return null; // No tracks available
  }

  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}

