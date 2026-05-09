const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'games.json');
const INPUT_PATH = path.join(__dirname, 'pokopow.txt');

if (!fs.existsSync(INPUT_PATH)) {
    console.error("Please create pokopow.txt with the scraped accounts text.");
    process.exit(1);
}

const text = fs.readFileSync(INPUT_PATH, 'utf8');
let games = [];
if (fs.existsSync(DB_PATH)) {
    try {
        games = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        console.error("Error reading games.json");
    }
}

// Split the text by 'GAME:' to process each game block
const gameBlocks = text.split(/GAME:\s*/);
let addedCount = 0;

for (let i = 1; i < gameBlocks.length; i++) {
    const block = gameBlocks[i];
    const lines = block.split('\n').map(l => l.trim());
    const gameName = lines[0].trim();
    
    // Find all Usernames and Passwords in this block
    const userMatches = [...block.matchAll(/Username\s*:\s*(.+)/g)];
    const passMatches = [...block.matchAll(/Password\s*:\s*(.+)/g)];
    
    const count = Math.min(userMatches.length, passMatches.length);
    for (let j = 0; j < count; j++) {
        const username = userMatches[j][1].trim();
        const password = passMatches[j][1].trim();
        
        games.push({
            id: "PKP_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + "_" + addedCount,
            game: gameName,
            username: username,
            password: password,
            image: "logo.png"
        });
        addedCount++;
    }
}

// Reverse to put newest at the top, if desired, or just push. The site's sorting might handle it.
fs.writeFileSync(DB_PATH, JSON.stringify(games, null, 2));
console.log(`Successfully parsed and added ${addedCount} accounts to games.json!`);
