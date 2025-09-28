export function generateGameCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getRandomTrack(players) { // player dict from db
  const tracks = []
  for (const playerData of Object.values(players)) {
    tracks.push(...playerData.topTracks);
  }
  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}