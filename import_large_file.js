require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runImport() {
    console.log("Starting import process...");

    // 1. Fetch all existing records from Supabase to prevent duplicates
    console.log("Fetching existing database records to check for duplicates...");
    let existingRecords = new Set();
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('games')
            .select('game, username, password')
            .range(from, from + step - 1);
            
        if (error) {
            console.error("Error fetching existing records:", error);
            return;
        }
        
        if (data && data.length > 0) {
            data.forEach(row => {
                const key = `${(row.game || '').trim()}||${(row.username || '').trim()}||${(row.password || '').trim()}`;
                existingRecords.add(key);
            });
            from += step;
            if (data.length < step) break;
        } else {
            break;
        }
    }
    const initialDbCount = existingRecords.size;
    console.log(`Found ${initialDbCount} existing records in the database.`);

    // 2. Read and parse the text file
    const filePath = 'C:\\Users\\Asus\\OneDrive\\Documents\\all id pass\\accounts final 333333333333.txt';
    console.log(`Reading file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Split into blocks by empty lines
    const blocks = fileContent.split(/\n\s*\n/);
    
    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    const newEntries = [];
    let currentTimestamp = Date.now();
    
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;
        
        let game = '';
        let user = '';
        let pass = '';
        
        lines.forEach(line => {
            if (line.toLowerCase().startsWith('game:')) {
                game = line.substring(5).trim();
            } else if (line.toLowerCase().startsWith('user:')) {
                user = line.substring(5).trim();
            } else if (line.toLowerCase().startsWith('pass:')) {
                pass = line.substring(5).trim();
            }
        });
        
        if (game && user && pass) {
            const key = `${game}||${user}||${pass}`;
            if (existingRecords.has(key)) {
                totalSkipped++;
            } else {
                existingRecords.add(key); // prevent duplicates within the file itself
                const gameTotal = game.split(',').filter(g => g.trim().length > 0).length || 1;
                
                newEntries.push({
                    id: 'N_' + (currentTimestamp++) + '_' + Math.floor(Math.random() * 10000),
                    game: game,
                    username: user,
                    password: pass,
                    game_total: gameTotal,
                    image: 'logo.png'
                });
            }
        } else {
            // Incomplete block
            totalFailed++;
        }
    });

    console.log(`Parsed file. Found ${newEntries.length} new entries to upload.`);
    console.log(`Duplicates skipped: ${totalSkipped}`);
    console.log(`Broken/incomplete skipped: ${totalFailed}`);

    // 3. Upload in chunks
    const CHUNK_SIZE = 500;
    for (let i = 0; i < newEntries.length; i += CHUNK_SIZE) {
        const chunk = newEntries.slice(i, i + CHUNK_SIZE);
        console.log(`Uploading chunk ${Math.floor(i/CHUNK_SIZE) + 1} of ${Math.ceil(newEntries.length/CHUNK_SIZE)}...`);
        
        const { error } = await supabase.from('games').insert(chunk);
        
        if (error) {
            console.error('Error uploading chunk:', error.message);
        } else {
            totalImported += chunk.length;
        }
    }

    const finalCount = initialDbCount + totalImported;

    console.log("\n===========================================");
    console.log("             IMPORT STATISTICS             ");
    console.log("===========================================");
    console.log(`> Total imported:              ${totalImported}`);
    console.log(`> Total skipped duplicates:    ${totalSkipped}`);
    console.log(`> Total failed/broken entries: ${totalFailed}`);
    console.log(`> Final accounts in database:  ${finalCount}`);
    console.log(`> Final listings in Library:   ${finalCount}`);
    console.log("===========================================\n");
}

runImport().catch(console.error);
