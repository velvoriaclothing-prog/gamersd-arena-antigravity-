const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('credentials-data.json', 'utf8'));
const games = JSON.parse(fs.readFileSync('games.json', 'utf8'));

console.log(`Total Accounts (credentials): ${creds.length}`);
console.log(`Total Games (games.json): ${games.length}`);

// Count claimed vs unclaimed
let claimed = 0;
creds.forEach(c => {
    if (c.is_claimed) claimed++;
});
console.log(`Claimed Accounts: ${claimed}`);
console.log(`Unclaimed Accounts: ${creds.length - claimed}`);

// Top games by account count
const gameCounts = {};
creds.forEach(c => {
    gameCounts[c.game_id] = (gameCounts[c.game_id] || 0) + 1;
});

const topGames = Object.entries(gameCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

console.log('\nTop 10 Games with most accounts:');
topGames.forEach(([id, count]) => {
    // Note: credentials have integer game_id, games.json has string id like "A1"
    const game = games.find(g => g.id === id || g.id === `A${id}` || id == g.id);
    console.log(`- ${game ? game.game : 'Unknown Game ID ' + id}: ${count} accounts`);
});

// duplicate usernames
const unameCounts = {};
creds.forEach(c => {
    unameCounts[c.username] = (unameCounts[c.username] || 0) + 1;
});
let duplicates = 0;
Object.values(unameCounts).forEach(c => {
    if (c > 1) duplicates++;
});
console.log(`\nDuplicate Usernames: ${duplicates}`);
