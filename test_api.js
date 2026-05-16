const http = require('http');

http.get('http://localhost:3000/api/games', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log(`API returned ${parsed.games ? parsed.games.length : 0} games.`);
        } catch(e) {
            console.log("Error parsing response");
        }
    });
}).on('error', err => {
    console.log("Error fetching API:", err.message);
});
