#!/usr/bin/env python3
"""
Generates the "Life, In Receipts" synthetic dataset.

Real seed data (reshaped, retimed, filtered — no PII, purely metadata):
  - spotify_history.csv            -> Music receipts (real track/artist/album + listening behaviour)
  - Daily Household Transactions.csv -> Purchase receipts (real category/amount/merchant-note patterns)

Everything else (Movies, Places, Photos, Messages, Searches, Events, Notes) is synthesized
to deliberately correlate — by day, location, people and tag — with a 6-chapter fictional
year in the life of "Meher", a product designer in Bangalore. The app's own clustering code
(not this script) is what has to *discover* those correlations, so we don't emit any
precomputed "chapter id" — only the raw signals (timestamp, tags, location, people).

Output: ../src/data/life-receipts.json
"""
import csv, json, random, hashlib
from datetime import datetime, timedelta

random.seed(42)

SEED_DIR = "seed"
OUT_PATH = "../public/data/life-receipts.json"

YEAR_START = datetime(2024, 10, 1)
YEAR_END = datetime(2025, 9, 30, 23, 59)

# ---------------------------------------------------------------------------
# Chapters: the ground truth the app must rediscover from raw signals alone.
# ---------------------------------------------------------------------------
CHAPTERS = [
    dict(
        key="autopilot", title="Autopilot",
        start=datetime(2024, 10, 1), end=datetime(2024, 11, 15),
        mood=["routine", "comfort", "distant-love", "tired"],
        tags=["work", "comfort-food", "routine", "missing-him", "late-nights", "long-distance"],
        people=["Kabir", "Ananya"],
        places=["Home", "Office - Koramangala", "Third Wave Coffee - Indiranagar",
                "Indiranagar Metro Station", "Forum Mall", "Sabjiwala Market"],
    ),
    dict(
        key="the-trip", title="The Trip",
        start=datetime(2024, 11, 16), end=datetime(2024, 12, 31),
        mood=["joyful", "anticipation", "love", "nostalgic"],
        tags=["travel", "reunion", "celebration", "new-year", "long-distance"],
        people=["Kabir", "Ananya"],
        places=["Pune Airport", "Kabir's Apartment - Pune", "Osho Teerth Garden",
                "Koregaon Park Rooftop Bar", "Home", "Office - Koramangala"],
    ),
    dict(
        key="unraveling", title="The Unraveling",
        start=datetime(2025, 1, 1), end=datetime(2025, 2, 20),
        mood=["sad", "anxious", "numb", "lonely"],
        tags=["breakup", "heartbreak", "late-nights", "moving-on", "long-distance"],
        people=["Kabir", "Ananya"],
        places=["Home", "Cubbon Park", "Blossom Book House", "Church Street",
                "Office - Koramangala"],
    ),
    dict(
        key="rebuilding", title="Rebuilding",
        start=datetime(2025, 2, 21), end=datetime(2025, 4, 15),
        mood=["determined", "hopeful", "sore", "content"],
        tags=["fitness", "self-care", "new-routine", "friendship", "moving-on"],
        people=["Ananya", "Zara", "Kunal"],
        places=["Cult Fit - HSR", "Lalbagh", "Home", "Office - Koramangala",
                "Matteo Coffea", "HSR BDA Complex"],
    ),
    dict(
        key="the-sprint", title="The Sprint",
        start=datetime(2025, 4, 16), end=datetime(2025, 6, 15),
        mood=["driven", "stressed", "proud", "wired"],
        tags=["work", "deadline", "coffee", "presentation", "promotion"],
        people=["Ananya", "Zara", "Priyanka (Manager)"],
        places=["Office - Koramangala", "Third Wave Coffee - Indiranagar", "Home",
                "Glen's Bakehouse", "Airport Road"],
    ),
    dict(
        key="new-constellations", title="New Constellations",
        start=datetime(2025, 6, 16), end=datetime(2025, 9, 30),
        mood=["excited", "open", "adventurous", "happy"],
        tags=["new-connection", "concerts", "travel", "friendship", "joy"],
        people=["Ananya", "Zara", "Kunal", "Arjun"],
        places=["Toit Brewpub", "Church Street", "Nandi Hills", "Baga Beach - Goa",
                "Anjuna Market - Goa", "Home", "Office - Koramangala"],
    ),
]

def chapter_for(dt):
    for c in CHAPTERS:
        if c["start"] <= dt <= c["end"]:
            return c
    return CHAPTERS[-1]

def rand_dt_in(start, end):
    delta = end - start
    secs = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=secs)

def rand_time_of_day(dt, hour_lo, hour_hi):
    h = random.randint(hour_lo, hour_hi)
    m = random.randint(0, 59)
    return dt.replace(hour=h, minute=m, second=random.randint(0, 59))

def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S")

_id_counters = {}
def make_id(kind):
    _id_counters[kind] = _id_counters.get(kind, 0) + 1
    return f"{kind}-{_id_counters[kind]:04d}"

receipts = []

def add(kind, dt, title, subtitle, tags, location=None, people=None, mood=None, meta=None):
    c = chapter_for(dt)
    all_tags = sorted(set((tags or []) + [c["key"]]))
    receipts.append({
        "id": make_id(kind),
        "type": kind,
        "timestamp": iso(dt),
        "title": title,
        "subtitle": subtitle,
        "tags": all_tags,
        "location": location,
        "people": people or [],
        "mood": mood or random.choice(c["mood"]),
        "meta": meta or {},
    })

# ---------------------------------------------------------------------------
# 1) MUSIC — real Spotify rows, retimed onto our fictional year & chapter mood
# ---------------------------------------------------------------------------
print("Reading spotify seed...")
spotify_rows = []
with open(f"{SEED_DIR}/spotify_history.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        if row.get("track_name") and row.get("artist_name"):
            spotify_rows.append(row)

random.shuffle(spotify_rows)

MUSIC_PER_CHAPTER = 40
idx = 0
for c in CHAPTERS:
    n_days = (c["end"] - c["start"]).days + 1
    for _ in range(MUSIC_PER_CHAPTER):
        if idx >= len(spotify_rows):
            break
        row = spotify_rows[idx]; idx += 1
        day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
        # late-night/heartbreak/sprint chapters skew toward late listening hours
        if c["key"] in ("unraveling", "autopilot"):
            dt = rand_time_of_day(day, 22, 23) if random.random() < 0.4 else rand_time_of_day(day, 7, 21)
        elif c["key"] == "the-sprint":
            dt = rand_time_of_day(day, 20, 23) if random.random() < 0.35 else rand_time_of_day(day, 8, 19)
        else:
            dt = rand_time_of_day(day, 7, 23)
        skipped = row.get("skipped", "False").strip().lower() == "true"
        ms_played = row.get("ms_played") or "0"
        try:
            ms_played = int(float(ms_played))
        except ValueError:
            ms_played = 0
        loc = None
        if random.random() < 0.5:
            loc = {"name": random.choice(c["places"]), "city": "Bangalore" if "Pune" not in " ".join(c["places"]) else random.choice(["Bangalore", "Pune"])}
        add("music", dt,
            row["track_name"], row["artist_name"],
            tags=["music", "skipped" if skipped else "played-through"],
            location=loc,
            mood=None,
            meta={
                "artist": row["artist_name"],
                "album": row.get("album_name") or "",
                "platform": row.get("platform") or "",
                "msPlayed": ms_played,
                "skipped": skipped,
                "shuffle": (row.get("shuffle", "False").strip().lower() == "true"),
                "reasonStart": row.get("reason_start") or "",
                "reasonEnd": row.get("reason_end") or "",
            })

print(f"  music receipts: {len(receipts)}")

# ---------------------------------------------------------------------------
# 2) PURCHASES — real household-transaction rows, retimed, expense-only
# ---------------------------------------------------------------------------
print("Reading household transactions seed...")
KEEP_CATEGORIES = {
    "Food", "Transportation", "Household", "subscription", "Apparel", "Beauty",
    "Culture", "Festivals", "Tourism", "Grooming", "Education", "Gift",
    "Self-development", "Social Life",
}
purchase_rows = []
with open(f"{SEED_DIR}/Daily Household Transactions.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        if row.get("Income/Expense") == "Expense" and row.get("Category") in KEEP_CATEGORIES:
            purchase_rows.append(row)

random.shuffle(purchase_rows)

PURCHASE_PER_CHAPTER = 24
idx = 0
for c in CHAPTERS:
    n_days = (c["end"] - c["start"]).days + 1
    for _ in range(PURCHASE_PER_CHAPTER):
        if idx >= len(purchase_rows):
            break
        row = purchase_rows[idx]; idx += 1
        day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
        dt = rand_time_of_day(day, 8, 22)
        try:
            amount = float(row["Amount"])
        except ValueError:
            amount = 0.0
        note = (row.get("Note") or row["Category"]).strip()
        loc = {"name": random.choice(c["places"]), "city": "Bangalore"}
        tags = ["purchase", row["Category"].lower().replace(" ", "-")]
        add("purchase", dt,
            note[:60] if note else row["Category"],
            f"₹{amount:,.0f} · {row['Category']}",
            tags=tags, location=loc,
            meta={
                "amount": amount, "currency": "INR",
                "category": row["Category"], "subcategory": row.get("Subcategory") or "",
                "mode": row.get("Mode") or "",
            })

print(f"  + purchase receipts, total now: {len(receipts)}")

# ---------------------------------------------------------------------------
# Synthetic vocabularies for the remaining 7 categories
# ---------------------------------------------------------------------------
MOVIES = [
    ("12th Fail", "Drama", "Prime Video"), ("Succession S4", "Drama", "HBO"),
    ("Heartstopper S2", "Romance", "Netflix"), ("Kantara", "Thriller", "Prime Video"),
    ("Jai Bhim", "Drama", "Prime Video"), ("Fleabag", "Comedy", "Prime Video"),
    ("Zindagi Na Milegi Dobara", "Comedy-Drama", "Netflix"),
    ("Attack on Titan: Final Season", "Anime", "Crunchyroll"),
    ("The Bear S2", "Drama", "Hotstar"), ("Aashiqui 2", "Romance", "Netflix"),
    ("Ted Lasso S3", "Comedy", "Apple TV+"), ("Dune: Part Two", "Sci-Fi", "Theatre - PVR Forum"),
    ("Gehraiyaan", "Drama", "Prime Video"), ("Spider-Man: Across the Spider-Verse", "Animation", "Netflix"),
    ("Three Idiots", "Comedy-Drama", "Netflix"), ("Arcane S2", "Animation", "Netflix"),
    ("Rocket Boys S2", "Drama", "SonyLIV"), ("Chhichhore", "Drama", "Prime Video"),
    ("Inside Out 2", "Animation", "Theatre - PVR Forum"), ("Scam 1992", "Drama", "SonyLIV"),
]

MESSAGE_SNIPPETS = {
    "Kabir": [
        "call when you're free?", "miss you today, more than usual",
        "how'd the meeting go?", "can't stop thinking about the trip",
        "I don't think this is working anymore", "we should talk properly, not over text",
        "I hope you're doing okay", "sent you something, check your mail",
    ],
    "Ananya": [
        "you up? need to vent", "third wave in 20?", "I'm coming over, don't argue",
        "proud of you for today", "same time tomorrow for the run?",
        "sent you the photos from last night", "you sounded off on the phone, you good?",
    ],
    "Zara": [
        "class got moved to 7am 😭", "new PR today let's gooo",
        "the usual spot after?", "sending you the playlist",
    ],
    "Kunal": [
        "brought extra protein bars if you want one", "great pace today",
        "sunday trek still on?",
    ],
    "Priyanka (Manager)": [
        "deck looks solid, one more pass on slide 12", "great work in there today",
        "let's sync before the client call", "loop me in on the timeline",
    ],
    "Arjun": [
        "that show was actually so good", "same time next friday?",
        "sending you that article I mentioned", "had a really good time tonight",
    ],
}

SEARCH_QUERIES_BY_MOOD = {
    "routine": ["best cafes near Indiranagar open late", "quick 20 minute dinner recipes",
                "how to fix bluetooth headphones cutting out", "metro timings HSR to Indiranagar"],
    "distant-love": ["cheap flights bangalore to pune december", "long distance relationship tips",
                     "video call apps with good quality low bandwidth", "how often should couples call"],
    "joyful": ["things to do pune new year", "best rooftop bars koregaon park",
               "new year outfit ideas 2025", "pune to bangalore flight december 31"],
    "sad": ["signs a relationship is ending", "how to stop checking someone's last seen",
            "why does heartbreak feel physical", "solo movie theatre bangalore",
            "best books about moving on", "long distance breakup advice"],
    "anxious": ["how to sleep when your mind won't stop", "cubbon park quiet spots",
                "is it normal to cry at work"],
    "determined": ["beginner 5k training plan", "how to start running without hating it",
                   "cult fit hsr timings", "high protein vegetarian meals bangalore"],
    "hopeful": ["how to make new friends after 24", "weekend trips near bangalore",
                "journaling prompts for moving on"],
    "driven": ["how to ask for a raise", "promotion talking points examples",
               "how to run a client presentation", "best productivity playlists"],
    "stressed": ["how to fix a slow figma file", "caffeine limit per day",
                 "how to say no to extra work nicely"],
    "proud": ["how to negotiate a promotion offer", "best team dinner spots koramangala"],
    "excited": ["upcoming concerts bangalore september", "goa itinerary 4 days friends",
                "best beaches near anjuna", "new dating apps worth trying"],
    "open": ["how to tell if a first date went well", "best coffee shops church street",
             "things to talk about on a second date"],
    "adventurous": ["nandi hills sunrise trek timing", "toit brewpub live music schedule"],
}

EVENTS = [
    ("Diwali Get-Together", "festival", ["Ananya", "Kabir"]),
    ("Kabir's Birthday (video call)", "birthday", ["Kabir"]),
    ("NYE Trip — Day 1", "trip", ["Kabir"]),
    ("NYE Rooftop Countdown", "celebration", ["Kabir"]),
    ("The Breakup Call", "milestone", ["Kabir"]),
    ("First Solo Sunday", "milestone", []),
    ("Cult Fit Induction", "fitness", ["Zara"]),
    ("First 5k Race", "fitness", ["Zara", "Kunal"]),
    ("Zara's Housewarming", "party", ["Zara", "Kunal", "Ananya"]),
    ("Big Client Presentation", "work", ["Priyanka (Manager)"]),
    ("Promotion Announced", "milestone", ["Priyanka (Manager)", "Ananya"]),
    ("Team Celebration Dinner", "work", ["Priyanka (Manager)", "Zara"]),
    ("Met Arjun (mutual friend's party)", "milestone", ["Arjun", "Ananya"]),
    ("Second Date with Arjun", "date", ["Arjun"]),
    ("Concert Night — Toit", "concert", ["Arjun", "Zara"]),
    ("Goa Trip — Day 1", "trip", ["Ananya", "Zara", "Kunal"]),
    ("Goa Trip — Beach Day", "trip", ["Ananya", "Zara", "Kunal"]),
    ("Ananya's Birthday", "birthday", ["Ananya"]),
    ("Nandi Hills Sunrise Trek", "adventure", ["Arjun", "Zara"]),
]

NOTES_BY_MOOD = {
    "routine": ["Same commute, same playlist, same everything. Not bad, just... on repeat.",
                "Made the good dal today. Small wins count."],
    "distant-love": ["Four more weeks till I see him. Counting badly.",
                     "Calls feel shorter every week. Probably just busy. Probably."],
    "joyful": ["The skyline from that rooftop is stuck in my head.",
               "First new year in years that didn't feel like an ending."],
    "sad": ["Deleted the thread and immediately regretted it.",
            "Nobody warns you heartbreak has a physical weight.",
            "Cubbon Park bench, third time this week. It helps a little."],
    "anxious": ["Couldn't focus in the meeting. Kept refreshing my phone.",
                "Told Ananya everything. Felt lighter after."],
    "determined": ["Ran the full loop without stopping. Small, stupid, proud.",
                   "Signed up for the 5k. Terrified. Doing it anyway."],
    "hopeful": ["Zara texted first today. It's nice being someone's plan again.",
                "Laughed until my stomach hurt. First time in weeks."],
    "driven": ["Rewrote the deck for the fourth time. It's finally right.",
               "Coffee count today: alarming. Deadline count: also alarming."],
    "stressed": ["Priyanka said the deck looks solid. Allowed myself to believe it.",
                 "Slept four hours. Worth it, I think. Ask me tomorrow."],
    "proud": ["They said yes. I keep rereading the email.",
              "Told mom about the promotion. She cried a little. So did I."],
    "excited": ["New person, new city energy, same old butterflies.",
                "Told Ananya about Arjun. She already approves, obviously."],
    "open": ["Good date. Didn't check my phone once. That's new.",
             "Starting to feel like myself again, just a slightly different version."],
    "adventurous": ["Sunrise at Nandi Hills. Worth the 4am alarm, barely.",
                    "Goa with this exact group of people, always."],
}

PHOTO_PALETTES = ["sunset", "citylights", "beach", "forest", "cafe", "concert", "skyline", "rain"]

# ---------------------------------------------------------------------------
# 3) MOVIES, 4) PLACES-as-events, 5) PHOTOS, 6) MESSAGES, 7) SEARCHES,
#    8) EVENTS, 9) NOTES — chapter-driven synthesis
# ---------------------------------------------------------------------------
for c in CHAPTERS:
    n_days = (c["end"] - c["start"]).days + 1

    for _ in range(7):  # movies/entertainment
        day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
        dt = rand_time_of_day(day, 19, 23)
        title, genre, platform = random.choice(MOVIES)
        add("movie", dt, title, f"{genre} · {platform}",
            tags=["entertainment", genre.lower().replace(" ", "-").replace("-drama","-drama")],
            location={"name": "Home", "city": "Bangalore"} if "Theatre" not in platform else {"name": platform.split(" - ")[-1], "city": "Bangalore"},
            people=random.sample(c["people"], k=min(1, len(c["people"]))) if random.random() < 0.3 else [],
            meta={"genre": genre, "platform": platform})

    for _ in range(9):  # searches
        day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
        dt = rand_time_of_day(day, 9, 23)
        mood = random.choice(c["mood"])
        pool = SEARCH_QUERIES_BY_MOOD.get(mood, ["bangalore weather this week"])
        q = random.choice(pool)
        add("search", dt, q, "Web search", tags=["search"], mood=mood, meta={"query": q})

    for person in c["people"]:
        for _ in range(6):  # messages
            day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
            dt = rand_time_of_day(day, 8, 23)
            pool = MESSAGE_SNIPPETS.get(person, ["hey, how's it going?"])
            snippet = random.choice(pool)
            add("message", dt, f"{person}", snippet,
                tags=["message"], people=[person],
                meta={"withPerson": person, "snippet": snippet})

    for _ in range(6):  # notes
        day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
        dt = rand_time_of_day(day, 21, 23)
        mood = random.choice(c["mood"])
        pool = NOTES_BY_MOOD.get(mood, ["Just a quiet day."])
        body = random.choice(pool)
        add("note", dt, body[:36] + ("…" if len(body) > 36 else ""), body,
            tags=["note", "journal"], mood=mood, meta={"body": body})

    for _ in range(7):  # places (check-ins, distinct from the location field on other receipts)
        day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
        dt = rand_time_of_day(day, 8, 22)
        place = random.choice(c["places"])
        cap_people = random.sample(c["people"], k=min(len(c["people"]), random.randint(0, 2))) if c["people"] else []
        add("place", dt, place, "Checked in" + (f" with {', '.join(cap_people)}" if cap_people else ""),
            tags=["place", "check-in"], location={"name": place, "city": "Bangalore"},
            people=cap_people, meta={"visitCount": random.randint(1, 12)})

    for _ in range(8):  # photos
        day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
        dt = rand_time_of_day(day, 10, 22)
        place = random.choice(c["places"])
        palette = random.choice(PHOTO_PALETTES)
        cap_people = random.sample(c["people"], k=min(len(c["people"]), random.randint(0, 2))) if c["people"] else []
        caption = f"{place}" + (f" with {', '.join(cap_people)}" if cap_people else "")
        add("photo", dt, caption, place,
            tags=["photo", palette], location={"name": place, "city": "Bangalore"},
            people=cap_people, meta={"palette": palette})

for name, kind, people in EVENTS:
    # place each named event at a specific sensible date within its chapter window
    c = next(ch for ch in CHAPTERS if any(p in name for p in [ch["title"]]) ) if False else None
    # map manually by keyword
    if "NYE" in name or "Diwali" in name:
        c = CHAPTERS[1] if "NYE" in name else CHAPTERS[0]
    elif "Breakup" in name or "Solo Sunday" in name:
        c = CHAPTERS[2]
    elif "Cult Fit" in name or "5k" in name or "Housewarming" in name:
        c = CHAPTERS[3]
    elif "Presentation" in name or "Promotion" in name or "Team Celebration" in name:
        c = CHAPTERS[4]
    else:
        c = CHAPTERS[5]
    n_days = (c["end"] - c["start"]).days + 1
    day = c["start"] + timedelta(days=random.randint(0, n_days - 1))
    dt = rand_time_of_day(day, 11, 21)
    loc = {"name": random.choice(c["places"]), "city": "Bangalore"}
    add("event", dt, name, kind.capitalize(),
        tags=["event", kind], location=loc, people=people, meta={"category": kind})

print(f"  total after synthesis: {len(receipts)}")

# ---------------------------------------------------------------------------
# GOLDEN MOMENTS — a few deliberate same-day, multi-type clusters per chapter,
# so the connection engine always has unmistakable stories to surface.
# ---------------------------------------------------------------------------
GOLDEN = [
    dict(chapter=0, day_offset=20, hour=21, place="Home", people=["Kabir"], mood="distant-love",
         parts=[
             ("music", "Slow Dancing in a Burning Room", "John Mayer", ["comfort", "replay"]),
             ("message", "Kabir", "miss you today, more than usual"),
             ("note", "Some nights the apartment feels too quiet.", None),
         ]),
    dict(chapter=1, day_offset=39, hour=23, place="Koregaon Park Rooftop Bar", people=["Kabir"], mood="joyful",
         parts=[
             ("music", "Ilahi", "Arijit Singh", ["celebration", "reunion"]),
             ("photo", "Koregaon Park Rooftop Bar with Kabir", None),
             ("purchase", "Two cocktails, rooftop bar", None),
             ("event", "NYE Rooftop Countdown", None),
         ]),
    dict(chapter=2, day_offset=10, hour=1, place="Home", people=["Kabir"], mood="sad",
         parts=[
             ("event", "The Breakup Call", None),
             ("music", "Someone Like You", "Adele", ["heartbreak", "late-night"]),
             ("note", "Deleted the thread and immediately regretted it.", None),
             ("search", "signs a relationship is ending", None),
         ]),
    dict(chapter=3, day_offset=15, hour=7, place="Cult Fit - HSR", people=["Zara"], mood="determined",
         parts=[
             ("event", "First 5k Race", None),
             ("music", "Stronger", "Kanye West", ["fitness", "milestone"]),
             ("photo", "Cult Fit - HSR with Zara", None),
             ("message", "Zara", "new PR today let's gooo"),
         ]),
    dict(chapter=4, day_offset=30, hour=19, place="Office - Koramangala", people=["Priyanka (Manager)"], mood="proud",
         parts=[
             ("event", "Promotion Announced", None),
             ("music", "Good as Hell", "Lizzo", ["celebration", "proud"]),
             ("message", "Priyanka (Manager)", "great work in there today"),
             ("purchase", "Team celebration dinner", None),
             ("note", "They said yes. I keep rereading the email.", None),
         ]),
    dict(chapter=5, day_offset=60, hour=20, place="Toit Brewpub", people=["Arjun", "Zara"], mood="excited",
         parts=[
             ("event", "Concert Night — Toit", None),
             ("music", "Kesariya", "Arijit Singh", ["new-connection", "joy"]),
             ("photo", "Toit Brewpub with Arjun, Zara", None),
             ("message", "Arjun", "had a really good time tonight"),
         ]),
]

for g in GOLDEN:
    c = CHAPTERS[g["chapter"]]
    day = c["start"] + timedelta(days=g["day_offset"])
    base_dt = day.replace(hour=g["hour"], minute=random.randint(0, 59))
    loc = {"name": g["place"], "city": "Pune" if "Pune" in g["place"] or "Koregaon" in g["place"] or "Osho" in g["place"] else "Bangalore"}
    for i, part in enumerate(g["parts"]):
        kind = part[0]
        dt = base_dt + timedelta(minutes=i * 7)
        if kind == "music":
            _, track, artist, extra_tags = part
            add("music", dt, track, artist,
                tags=["music", "golden-moment"] + extra_tags, location=loc,
                people=g["people"], mood=g["mood"],
                meta={"artist": artist, "album": "", "platform": "mobile app",
                      "msPlayed": random.randint(120000, 240000), "skipped": False,
                      "shuffle": False, "reasonStart": "clickrow", "reasonEnd": "trackdone"})
        elif kind == "message":
            _, person, snippet = part
            add("message", dt, person, snippet,
                tags=["message", "golden-moment"], location=loc,
                people=[person], mood=g["mood"], meta={"withPerson": person, "snippet": snippet})
        elif kind == "note":
            _, body, _ = part
            add("note", dt, body[:36] + ("…" if len(body) > 36 else ""), body,
                tags=["note", "journal", "golden-moment"], location=loc,
                people=g["people"], mood=g["mood"], meta={"body": body})
        elif kind == "search":
            _, query, _ = part
            add("search", dt, query, "Web search",
                tags=["search", "golden-moment"], location=loc,
                mood=g["mood"], meta={"query": query})
        elif kind == "photo":
            _, caption, _ = part
            add("photo", dt, caption, g["place"],
                tags=["photo", "golden-moment", random.choice(PHOTO_PALETTES)], location=loc,
                people=g["people"], mood=g["mood"], meta={"palette": random.choice(PHOTO_PALETTES)})
        elif kind == "purchase":
            _, note, _ = part
            amount = random.choice([350, 480, 620, 899, 1200, 1450, 2200])
            add("purchase", dt, note, f"₹{amount:,.0f}",
                tags=["purchase", "golden-moment"], location=loc,
                people=g["people"], mood=g["mood"],
                meta={"amount": float(amount), "currency": "INR", "category": "Social Life",
                      "subcategory": "", "mode": "Card"})
        elif kind == "event":
            _, name, _ = part
            evt_kind = next((k for n, k, _ in EVENTS if n == name), "milestone")
            add("event", dt, name, evt_kind.capitalize(),
                tags=["event", "golden-moment", evt_kind], location=loc,
                people=g["people"], mood=g["mood"], meta={"category": evt_kind})

print(f"  total after golden moments: {len(receipts)}")

receipts.sort(key=lambda r: r["timestamp"])

with open(OUT_PATH, "w") as f:
    json.dump({
        "persona": {
            "name": "Meher",
            "range": {"start": iso(YEAR_START), "end": iso(YEAR_END)},
            "chapters": [{"key": c["key"], "title": c["title"],
                          "start": iso(c["start"]), "end": iso(c["end"])} for c in CHAPTERS],
        },
        "receipts": receipts,
    }, f, indent=None, separators=(",", ":"))

by_type = {}
for r in receipts:
    by_type[r["type"]] = by_type.get(r["type"], 0) + 1
print("Done. Counts by type:", json.dumps(by_type, indent=2))
print("Total:", len(receipts))
