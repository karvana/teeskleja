# Teeskleja

A pass-and-play imposter word game for phones. Everyone except the imposter(s) gets the same secret word; imposters only see its category. Players give one clue each, discuss, and vote secretly.

The UI and the word lists are in Estonian; the code is in English.

## Tech

- Static site with plain HTML, CSS and JS. No build step and no dependencies.
- Installable PWA. After the first visit it works offline, and it can be added to the home screen.
- State is saved in `localStorage`, so a reload or a locked phone resumes the current round.

| File | Purpose |
| --- | --- |
| `game.js` | Pure game rules (roles, rounds, voting, tie-breaks, scoring). No DOM access. |
| `ui.js` | Screen rendering and event handling. |
| `strings.et.js` | All user-facing UI text (Estonian), accessed via `t(key, vars)`. |
| `words.js` | Word categories and words (Estonian). |
| `sw.js` | Service worker: network-first with an offline cache fallback. |
| `manifest.webmanifest`, `icons/` | PWA metadata and icons. |

## Rules implemented

Based on the "Imposter Word Game – Rules Specification":

- 3–20 players. The recommended imposter count and discussion time follow the player count, and the host can change both.
- The starting player rotates every round. Clues cannot be changed (there is no going back).
- Voting is secret: the phone is passed around, and nobody can vote for themselves.
- Tie: a 30 s extra discussion, then a re-vote among the tied players. After 2 re-votes that are still tied, the imposters survive.
- **Several imposters:** each vote removes one player. Voting out a civilian means the imposters win. Catching an imposter while more remain leads to another discussion and vote.
- **Final guess** (toggle): a caught imposter says a guess out loud, and the group marks it right or wrong.
- **Scoring:** each winning civilian gets +1. Each imposter gets +2 when the imposters win.

## Run locally

```powershell
python -m http.server 5173
```

Open <http://localhost:5173>. To try it on a phone on the same Wi-Fi, run `python -m http.server 5173 --bind 0.0.0.0` and open `http://<PC-IP>:5173`. Offline mode and installing need HTTPS, so they won't work there, but the game itself does.

## Publish (pick one)

**Netlify Drop (no account setup beyond sign-in):**
1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `Teeskleja` folder onto the page.
3. Open the HTTPS link you get on your phone.

**GitHub Pages:**
1. Create a repository and push these files to it, with `index.html` at the repository root.
2. Go to Settings → Pages → Build and deployment → Deploy from a branch → `main` / root.
3. Open `https://<user>.github.io/<repo>/` on your phone.

**Add it to the home screen:**
- iPhone: open it in Safari → Share → Add to Home Screen.
- Android: open it in Chrome → menu → Install app (or Add to Home screen).

## Editing words

Add or change words in `words.js`. Each category has an English `id`, a display `label`, and a `words` list. Avoid duplicate words within a category.
