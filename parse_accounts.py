import re
import json

log_path = r"C:\Users\Asus\.gemini\antigravity\brain\78f4dc90-cfcd-43f9-9baf-9b2028a75668\.system_generated\logs\overview.txt"

with open(log_path, 'r', encoding='utf-8') as f:
    text = f.read()

# The user prompt contains chunks like:
# Account 1
# 
# GAME :
# Grand Theft Auto V Legacy
# 
# USERNAME :
# cooljerlee
# 
# PASSWORD :
# Jerlee123@
# 
# --------------------------------------------------

pattern = re.compile(
    r"Account \d+\s*GAME :\s*(.*?)\s*USERNAME :\s*(.*?)\s*PASSWORD :\s*(.*?)\s*(?:--------------------------------------------------|\n\n\n|$)",
    re.DOTALL
)

matches = pattern.findall(text)
games = []

for i, match in enumerate(matches):
    game_title = match[0].strip()
    username = match[1].strip()
    password = match[2].strip()
    
    # Exclude the 'no account' entry if it exists
    if game_title.lower() == 'no account' or game_title.lower() == 'no':
        continue
        
    games.append({
        "id": f"A{i+1}",
        "game": game_title,
        "username": username,
        "password": password,
        "image": "logo.png"
    })

# Reverse to put newest at top (if desired, or keep as is)
# We will just write to games.json
with open('games.json', 'w', encoding='utf-8') as f:
    json.dump(games, f, indent=2)

print(f"Parsed {len(games)} accounts successfully and saved to games.json!")
