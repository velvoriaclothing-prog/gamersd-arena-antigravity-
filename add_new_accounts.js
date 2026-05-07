const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'games.json');
const games = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const newAccounts = [
    { game: "Demon Slayer -Kimetsu no Yaiba- The Hinokami Chronicles", username: "dunfentengdu1812", password: "08XiniuGM2008" },
    { game: "Resident Requiem - Steam 2", username: "jpyms76790", password: "161shwj9221" },
    { game: "Resident Requiem - Steam 3", username: "70xplay_com_re9e", password: "wbsite:70Xplay.CoM" },
    { game: "Resident Requiem - Steam 4", username: "Shldn25", password: "campjava67" },
    { game: "Resident Requiem - Steam 5", username: "pakinta", password: "www.pokopow.com" },
    { game: "Resident Requiem - Steam 6", username: "fazecrona1", password: "Leonardo172" },
    { game: "Resident Requiem - Steam 7", username: "caigamer_cn_re9_5", password: "cAigaMeR.Cn" },
    { game: "Resident Requiem - Steam 8", username: "caigamer_cn_re9_2", password: "caiGamer.cn" },
    { game: "Resident Requiem - Steam 9", username: "caigamer_cn_re9_4", password: "caIgamEr.CN" },
    { game: "Resident Requiem - Steam 10", username: "pvudq04741", password: "fbmh06340J" },
    { game: "Resident Requiem - Steam 11", username: "hqhmq15120", password: "yhcga08962" },
    { game: "Resident Requiem - Steam 12", username: "bitvl50415", password: "wvmwj37119" },
    { game: "Resident Requiem - Steam 13", username: "rsmnq13107", password: "ttqvy74808" },
    { game: "Resident Requiem - Steam 14", username: "wukdfu5985", password: "tbuew9953" },
    { game: "Microsoft flight simulator 2020 (Dovyrth)", username: "Dovyrth", password: "Nzkahdn97" },
    { game: "Mafia Old Country, Metro 2033, Metro Last Light Complete, Sniper Ghost Warrior, Pay Day 2, Content Warning, Age of Empire 3, Ark Survival Evolved, War Frame, Apex, Take on Helicopters, The Gunk, Brawlhalla, PUBG, Postal Redux, Poppy Playtime 1-5, Kholat, Truck World, Supermarket, Don't Starve Together", username: "mafia_phasmavpn", password: "qWERTY33!" },
    { game: "Mafia Old Country (Pakinta)", username: "pakinta", password: "www.pokopow.com" },
    { game: "Mafia Old Country Only", username: "mkhh0693", password: "wxsr4347" },
    { game: "Demon Slayer 2 with all DLC", username: "fuogl63477", password: "siuk94330T" },
    { game: "Stellar Blade, Once Human, Russian Fishing 4, Black Myth: Wukong, Bloodstained: Ritual of the Night, Call of Duty, Deadswitch 3, Detroit: Become Human, EA SPORTS FC 25, The First Descendant, Forza Motorsport, It Takes Two, KARDS, The Last of Us, The Last of Us Part II Remastered, LIMBO, Marvel's Spider-Man 2, A Plague Tale: Requiem, Realm of the Mad God Exalt, Tom Clancy's Rainbow Six Siege, WUCHANG: Fallen Feathers", username: "test539682", password: "kCNQTA642" },
    { game: "BeamNG.drive, The Last of Us 2, Stellar Blade, WUCHANG: Fallen Feathers", username: "mutnr91844", password: "dolus86-FunPAy" },
    { game: "Stellar Blade (Dedicated)", username: "lzmio79653", password: "ejgc61728I" },
    { game: "Crimson Desert", username: "ehtkd33230", password: "vohhe98963" },
    { game: "Death Stranding 2 On The Beach, Battlefield Redsec 6, Call of Duty Warzone 2025", username: "hojao97634", password: "23514409" },
    { game: "Death Stranding 2 On The Beach, Forza Horizon 6 Pre-order", username: "czcbe53658", password: "6https://t.me/vpegames" },
    { game: "Call of Duty Black Ops 7 Multiplayer, Endgame, Zombie, Warzone 2025", username: "mjv01i6k7ri8u", password: "fjl37d0ow58k1" },
    { game: "Call of Duty 7 Black Ops Multiplayer, Open Beta, Standard Edition, Zombie, Warzone, Warzone 2025", username: "bxirw2h9e", password: "imDm9IqPiFrdGtM" },
    { game: "God of War, Ghost of Tsushima, Mafia Definitive Edition, Mafia 2, Mafia 3, Mafia: The Old Country", username: "pokopowaction", password: "www.pokopow.com#9742" },
    { game: "700+ Best Games (GoW, Death Stranding 2, BMW, Spider-Man Both, Requiem)", username: "4tTbs8Lh", password: "https://funpay.com/users/18318680/" },
    { game: "200 Games (Spider-Man Both, Borderlands, Forza 5, Horizon Zero Dawn, Forbidden West, Mafia All, RE All, Uncharted, Witcher 3)", username: "shop444499", password: "https://funpay.com/users/12858044/" },
    { game: "Detroit, Euro Truck 2, The Forest, Hollow Knight, Left 4 Dead 2, Payday 2, REPO, Sons of the Forest, Terraria", username: "nekt0inoy", password: "https://funpay.com/users/16100391/" },
    { game: "200 Best Games (Elden Ring, Hitman 2, Assassin's Creed, RE 5-7, L4D 1-2, Mafia All, Stalker 2, Train Sim 6, Ark, The Walking Dead, Witcher Series, Dying Light, Divinity 2, Payday 2, Outlast, Ghostrunner, Half-Life Series, Game of Thrones)", username: "8wlztapigfczqyb6wm1y", password: "TeqwnryqE124hrqw12" },
    { game: "50 Games (Forza 4, BeamNG, Assetto, Euro Truck 2, Detroit, GTA 3, GTA Auto, Vice City, Hollow Knight, Mortal Kombat X, Portal Both, Metro Exodus)", username: "rhkdg52916", password: "https://funpay.com/users/14277882/" },
    { game: "Microsoft Flight Simulator 2024, Call of Duty Warzone 2025, MW2 Old, Asphalt Legend Dark Hours, Delta Force", username: "antonioralph1972ff", password: "0Oe!brsaxqsn2206" },
    { game: "BF6, Sid Meier's Civilization 5, Warhammer Vermintide 2, eFootball, It Takes Two, Life is Strange", username: "gutichelenar", password: "TMQO5QAyQm1!Aa" },
    { game: "Call of Duty: Modern Warfare III", username: "ajeh82399", password: "marpanov_free24" }
];

newAccounts.forEach((acc, index) => {
    games.push({
        id: "NEW_" + Date.now() + "_" + index,
        game: acc.game,
        username: acc.username,
        password: acc.password,
        image: "logo.png"
    });
});

fs.writeFileSync(DB_PATH, JSON.stringify(games, null, 2));
console.log("Successfully added " + newAccounts.length + " new accounts.");
