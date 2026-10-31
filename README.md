# ODIN'S INTEL // HAJIN DMZ

An interactive intel map for **Call of Duty: Modern Warfare 4 (2026) DMZ, map Hajin**.
It's plain HTML/CSS/JS with no build step, so it runs as-is on GitHub Pages.

Live site: https://odinn-dmz.github.io/hajin-dmz-intel/
Source: https://github.com/Odinn-DMZ/hajin-dmz-intel

## What's inside

| Tab | Contents |
|---|---|
| **Map** | A vector map (SVG) with pan, zoom, and pinch. It has 18 toggleable layers, search (name, text, or grid such as `G6`), and click-for-details with confidence and sources. Each pin has a shareable link (`#item=<id>`). |
| **Keys** | The full 59-key table: rarity, grid, door/location, contents, worth-it, and confidence. It is filterable and each row has a "Map" button. |
| **Banks** | Hanex heist steps, plus the 6 bank locations with landmarks, threats, and exfils. |
| **Money** | Money routes and cash facts. The compound run, 5-vault bank run, and silo loop are also drawn on the map. |
| **Keep / Sell** | Loot keep-vs-sell guidance. |
| **Sources** | Credits and which side of the border each location is on. |

Threat shading uses the level words already in each major location's `threat` text (Extreme, Critical, High, Medium, Low). A place with no level is unrated. [CODMunity's Hajin map](https://codmunity.gg/dmz/map) was used only to cross-check those levels and which side of the border each of the 13 locations is on. Where it disagrees, both accounts stay on the Sources tab.

There is no roads layer. The repo has no public road geometry, and roads were not traced from map art.

Map layers:
- POIs
- Strongholds
- Banks
- Compounds
- Keys
- Lieutenant loot rooms
- Ultra lockers
- Bosses
- Caches/drops/safes
- Secret spots
- Silo bunkers
- Exfils
- Gas stations (car batteries)
- Police/fire/clinics
- Ammo caches
- UAV and Lieutenant hunt towers
- SAM/bounty
- Player spawns

### Confidence tags
Every item has a `conf` value and a `src` list:
- `official`: Activision data or text
- `high`: several sources agree, or it was filmed
- `guide`: a tested fan or press guide
- `medium`: one good source, or only partly documented
- `community`: a dmzradar community pin
- `creator`: a single creator's claim
- `low`: undocumented
- `rumor`: unverified

Pins also have a `precision` value: `exact`, `community pin`, or `approx. (placed at parent POI)`. A small red dot on a pin means low confidence or rumor.

## Files

```
index.html        page shell
css/style.css     dark Norse/tactical theme
js/app.js         all app logic (vanilla JS)
data.json         ALL map data (edit this to update the map)
assets/           original SVG icons (raven, Valknut-style knot, favicon)
.nojekyll         tells GitHub Pages to serve files as-is
README.md
```

## Run locally

`fetch()` does not work from `file://`, so serve the folder:

```bash
cd hajin-dmz-intel
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages

1. Create a new **public** repo on GitHub, for example `hajin-dmz-intel`.
2. Upload the *contents* of this folder to the repo root, including `.nojekyll`. Use **Add file → Upload files**, or:
   ```bash
   cd hajin-dmz-intel
   git init && git add . && git commit -m "Odin's Intel: Hajin DMZ map"
   git branch -M main
   git remote add origin https://github.com/Odinn-DMZ/hajin-dmz-intel.git
   git push -u origin main
   ```
3. This repo deploys with GitHub Actions (`.github/workflows/pages.yml`) on every push to `main`. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. The site is at `https://odinn-dmz.github.io/hajin-dmz-intel/`.
5. To update, edit `data.json` (or anything else), then commit and push. Pages redeploys automatically.

## Basemap and the optional map image

The default basemap is drawn **only from coordinates**:
- POI positions and labels
- an **estimated** 10×10 grid (A–J, rows numbered north→south; the official map has no grid)
- a coarse low-resolution outline of the playable area

It contains no game artwork, so it is safe to publish.

The default background is the tactical grid. This repo does not include a map picture. Each visitor supplies their own image:

- Click **Load map image**, pick a file on that device, and it draws **under the grid and pins**.
- It stays in the browser. It is never uploaded.
- **Show map image** hides or shows it. The **Opacity** slider fades it.
- A file whose pixel size is exactly **1160×1080** uses the numeric preset in `data.json` → `basemap.imagePresets` (`bounds` is `[x, y, width, height]` in tac-map units: `[608.3, 481, 2730.2, 3197.1]`). That scale and offset was fitted so the prison, Haneul reactor, Cheongun (Heavenly Luck Casino), and Mirae stronghold pins sit on that layout's icons. Only those numbers are stored — no map image.
- Any other size uses `basemap.imageBounds` (the full 4096×4096 frame unless you change it).

To ship one image for every visitor, put a file in `assets/` and set `basemap.image` in `data.json`. The same size check applies.

## Editing data.json

- `items[]`: map pins `{id, layer, name, x, y, grid, conf, src[], precision, desc, ...}`. Coordinates are in the official 4096×4096 Tac Map space, with the origin at top-left.
- `layers[]`: layer id, name, colour, icon, and whether it is on by default.
- `keys[]`: the keys table. Pins link to a key through `keyId`.
- `routes[]`: polylines for money routes.
- `money[]`, `cash[]`, `loot{}`, `heistSteps[]`, `gaps[]`, `sources[]`: content for the other tabs.
- The grid formula lives in `meta.grid`: column = `A + floor((x − 708) / 270)`, row = `floor((y − 722) / 270)`.

## Known gaps (Oct 30, 2026)

- **Dead drops:** 42 spawn points exist, but their coordinates aren't transcribed, so they are not on the map.
- **Hidden caches:** only 12 of about 59 spawns are pinned.
- **Keys marked "approx."** sit at their parent POI, not the exact door.
- **Banks:**
  - The NuriGO West and Songdo panel and door spots are undocumented.
  - How the Grid tower vault code works is unconfirmed.
- **Grid:** estimated. Some sites (e.g. dmzradar) number rows one higher, so their sector is shown in the details where known.
- **Exfils:** community pins. Only 3–4 are live per match.
- **Bosses:**
  - The Battle Tank Commander's location is unknown.
  - Several Lieutenants are placed at their home POI.
- **Not covered yet:** Season 1 / X01 (Nov 5, 2026).

## Credits

Data compiled from the following. Please support them:
- Activision's official Hajin Tac Map data and DMZ blog
- DMZ Radar (dmzradar.com) community pins and guides
- DMZ Tracker key database
- COD Central
- metaradar.gg
- dmzmap.com
- Metka
- Game Rant
- games.gg
- GamerFuzion / LaserBolt
- GGRanked
- dmztracker.gg
- dmzwiki
- hajindmzkeys.com
- mw4meta
- player posts on X

Full links are in `data.json → sources` and on the **Sources** tab.

The raven and Valknut-style icons are original drawings for this project.

Fonts: Cinzel, Rajdhani, and Share Tech Mono via Google Fonts (SIL Open Font License).
