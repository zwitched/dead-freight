# Dead Freight

The railway closed thirty years ago. Nobody told the trains.

You drive D4071, a tired 1961 shunter, out of Hallow Junction depot onto a branch-line network that was left the way it was the week the line shut. Wagons are still standing in the sidings, loaded. Your job is to couple them up and get them home in one piece. Every wagon you take makes the train slower to start, much slower to stop, likelier to stall on a bank and rougher on whatever is inside.

A portrait mobile web game. Vanilla JavaScript and Canvas, no libraries, no build step, no network calls. All graphics are drawn in code and all sound is synthesized with Web Audio.

## Play

- Online: https://zwitched.github.io/dead-freight/
- Single file: `dist/index.html` has everything inlined. Open it straight from disk.
- From source:

```
cd dead-freight
python3 -m http.server 8000
# open http://localhost:8000  (on a phone on the same Wi-Fi: http://<computer LAN IP>:8000)
```

Served over http(s), it installs to the home screen (manifest + service worker) and plays offline after the first load.

## How to drive

| Control | What it does |
|---|---|
| **Brake** lever (left, red) | Slide up to release, down to brake. It stays where you leave it. |
| **Power** lever (right) | Six notches, 0 to 5. Stays where you leave it. |
| **FWD / REV** | Direction. Only changes when you're stopped. |
| **Points** button | Shows the next set of points ahead, how far, and where they send you. Tap to change. |
| Tap points on the track | Throws them too. Points with a train on them won't move. |
| Tap a wagon | Its label: cargo, weight, value, condition. Coupled wagons get a *Leave* button to uncouple them. |
| Drag the view | Look around. It drifts back to the train. |
| **Horn**, **Sand** | Horn while held. Sand gives grip for 4 s (needs sanders from the engine shed). |
| Minimap | Opens the full map. |

Desktop testing works with the mouse; keys too: W/S power, B/V brake, R reverser, P points, H horn.

## The rules of the line

- **Weight.** Every wagon adds tonnes. Acceleration drops, braking distance grows (old wagon brakes barely help), the stop marker on the track shows where full brake would stop you. Red means you won't stop before something.
- **Banks.** Kesh Bank (1 in 30) and Mercy Bank (1 in 24) stall heavy trains. Full power from a stand spins the wheels; ease off a notch. Take a run at it, fit sanders, or leave a wagon on the bank.
- **Couplings.** Under about 4 mph is soft. Faster breaks things, especially fragile loads. Better buffers raise the limit.
- **Fragile** loads (glass, chimney pots, lenses) crack under hard braking. **Loose** loads (grain, logs, cullet) spill if you take the curves over the posted limit.
- **Points** you run through from behind set themselves. Points you face have to be set, and can't be moved under a train.
- **Getting home.** Stop with the whole train past the yellow board in the goods road, then Deliver. Hit the buffers too fast and you derail.
- **Fuel.** Running dry strands you. You can always radio for a tow (pause menu): the shift ends with half pay for whatever you were hauling.

## Modes

- **Career.** One shift per day. The dispatch board lists the freight out on the line today and where it is. Pay depends on condition. Spend it in the engine shed (brakes, traction, fuel tank, sanders, buffers) and on line repairs that open new places: Kesh Viaduct, Larch Cut, Cobble Hill Quarry, Upper Ferrow. There is an ending, and the line stays open after it.
- **Daily freight.** Whole line open, a fixed loan engine, the same seeded freight for everyone on that date. Best score is kept.

Logbook notes are hidden along the line; drive past to find them.

## Places

Hallow Junction depot, Brickfield Sidings, Kesh Bank, Mercy Grain Elevator (passing loop and a steep bank), Kesh Viaduct and Kesh Water, Harl & Sons Glassworks, Larch Cut (wet rails), Cobble Hill Quarry (heavy, downhill home), Upper Ferrow (end of the line).

## Deploy

Any static host. GitHub Pages:

```
gh repo create <you>/dead-freight --public --source=. --push
gh api repos/<you>/dead-freight/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

Rebuild the single file after changing code: `python3 build.py`. If you change files, bump `CACHE` in `sw.js`.

## Tests

Browser tests drive the game the way a player does: real touch events (Chrome DevTools `Input.dispatchTouchEvent`) on the actual levers, buttons and track view, in Pixel 7 and iPhone emulation. `page.evaluate` is used to read state, to lay out scenarios (`tests/fixture.js`: where the train stands and what it's pulling), and in a few menu and recovery checks to set cash, fake app backgrounding or corrupt the save. Driving, points, coupling, delivering and buying are always done with touches.

```
pip install playwright && python -m playwright install chromium
bash tests/run_all.sh
```

- `test_slice.py` the vertical slice on Pixel 7 and iPhone 13: depot, drive, set points, couple gently, reverse, home, deliver, paid, next shift.
- `test_mechanics.py` weight vs acceleration and braking, stop marker accuracy, wheelslip, sand, stalling on a bank and recovering by leaving wagons, coupling speed, fragile and loose loads, points (tap, occupied, trailing), reverser lockout, closed and repaired viaduct, derailing at the buffers, running out of fuel and the tow, pointercancel, two-thumb control.
- `test_menus.py` every menu, depot tabs, upgrades with their real effect, repairs, daily reproducibility, pause, backgrounding, map, save/reload, settings persistence, logbook.
- `test_recovery.py` never stuck: tow from the pause menu, out of fuel, backing out of a dead end, save and reload, a corrupt save, switching apps.
- `test_layout.py` portrait layouts from iPhone SE to large Android: nothing overlaps, everything on screen and big enough to hit.
- `test_career.py` a longer play-through by a touch-driven bot: three shifts where it picks freight, plans a route, sets the points as they come up, brings it home and delivers, then buys an upgrade.
- `test_http.py` manifest, service worker, offline reload, and `dist/index.html` from disk.
- `test_perf.py` frame times while driving.
