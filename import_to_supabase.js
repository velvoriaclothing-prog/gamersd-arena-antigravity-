require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
    console.log("Reading games.json...");
    const rawData = fs.readFileSync('games.json', 'utf8');
    const games = JSON.parse(rawData);

    console.log(`Found ${games.length} games. Starting import to Supabase...`);

    // Prepare data for upsert
    const formattedGames = games.map(g => ({
        id: g.id.toString(),
        game: g.game,
        username: g.username || '',
        password: g.password || '',
        image: g.image || 'logo.png',
        game_total: 1
    }));

    // Chunk size for Supabase
    const CHUNK_SIZE = 500;
    
    for (let i = 0; i < formattedGames.length; i += CHUNK_SIZE) {
        const chunk = formattedGames.slice(i, i + CHUNK_SIZE);
        console.log(`Uploading chunk ${Math.floor(i/CHUNK_SIZE) + 1} (${chunk.length} items)...`);
        
        const { error } = await supabase
            .from('games')
            .upsert(chunk, { onConflict: 'id' });
            
        if (error) {
            console.error('Error uploading chunk:', error);
            return;
        }
    }

    console.log("✅ Import completed successfully!");
}

importData().catch(console.error);
