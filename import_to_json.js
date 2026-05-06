const fs = require('fs');
const path = require('path');

const rawDataPath = path.join(__dirname, 'scratch', 'raw_data.txt');
const gamesPath = path.join(__dirname, 'games-data.json');
const credsPath = path.join(__dirname, 'credentials-data.json');

if (!fs.existsSync(rawDataPath)) {
    console.error("Raw data file not found.");
    process.exit(1);
}

const content = fs.readFileSync(rawDataPath, 'utf8');
const sections = content.split('--------------------------------------------------');

const gamesMap = new Map();
const credentials = [];

sections.forEach(section => {
    if (!section.trim()) return;

    const gameMatch = section.match(/GAME\s*:\s*([\s\S]*?)\s*USERNAME/);
    const userMatch = section.match(/USERNAME\s*:\s*([\s\S]*?)\s*PASSWORD/);
    const passMatch = section.match(/PASSWORD\s*:\s*([\s\S]*)/);

    if (gameMatch && userMatch && passMatch) {
        const gameTitle = gameMatch[1].trim();
        const username = userMatch[1].trim();
        const password = passMatch[1].trim();

        if (!gameTitle) return;

        if (!gamesMap.has(gameTitle)) {
            const id = gamesMap.size + 1;
            let image = `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80`;
            let genre = 'Action';
            
            const lower = gameTitle.toLowerCase();
            if (lower.includes('netflix')) {
                image = 'https://images.unsplash.com/photo-1574375927938-d5a98e898ad7?w=800&q=80';
                genre = 'Streaming';
            } else if (lower.includes('crunchyroll')) {
                image = 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=800&q=80';
                genre = 'Anime';
            } else if (lower.includes('disney')) {
                image = 'https://images.unsplash.com/photo-1601944114954-467a7daee935?w=800&q=80';
                genre = 'Streaming';
            } else if (lower.includes('vpn')) {
                image = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80';
                genre = 'Security';
            } else if (lower.includes('minecraft')) {
                image = 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&q=80';
                genre = 'Sandbox';
            } else if (lower.includes('gta') || lower.includes('grand theft auto')) {
                image = 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=800&q=80';
                genre = 'Action';
            }

            gamesMap.set(gameTitle, {
                id: id,
                name: gameTitle,
                description: `Elite access for ${gameTitle}. High performance accounts with permanent access. Verified by Gamers Arena Team.`,
                price: 0,
                type: 'free',
                image: image,
                genre: genre,
                platform: 'PC'
            });
        }

        const game = gamesMap.get(gameTitle);
        credentials.push({
            id: credentials.length + 1,
            game_id: game.id,
            username: username,
            password: password,
            is_claimed: false
        });
    }
});

const gamesList = Array.from(gamesMap.values());

fs.writeFileSync(gamesPath, JSON.stringify(gamesList, null, 2));
fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2));

console.log(`Successfully imported ${gamesList.length} unique games and ${credentials.length} accounts.`);
