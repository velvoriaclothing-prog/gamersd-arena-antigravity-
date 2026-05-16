require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // get count
    const { count, error } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true });
        
    console.log("Total games in Supabase:", count);
}

test().catch(console.error);
