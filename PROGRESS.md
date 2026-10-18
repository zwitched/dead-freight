# DEAD FREIGHT progress
Identity: physical train handling on a top-down rail network. Two levers (brake left, power right), FWD/REV, tap points.
Weight -> slower acceleration, longer braking (stop marker), stalls and wheelslip on banks, fragile and loose loads, coupling speed, points locked under a train.

## Done
- Vertical slice verified by tests/test_slice.py (Pixel 7 + iPhone 13, real CDP touches)
- Career (shifts, cash, 5 upgrades x3, 4 line repairs, ending), Daily (seeded by date), logbook notes, settings
- PWA manifest + service worker + icons, build.py -> dist/index.html, README
- Physics retune (G 32, more adhesion and pull) so early trains are forgiving
- Bugs found by tests and fixed: barrier radio crash froze the game; repaired lines never opened (bar keys);
  timers leaking between shifts; left-behind wagons recoupled on the slightest roll back; stall warning never fired
- Main loop catches errors so a bad frame cannot freeze the game
- Test suites: slice, mechanics, menus, recovery, layout, http/offline, career bot, perf (tests/run_all.sh)

## Next
- Run all suites green, screenshots review, rebuild dist
- Deploy: zwitched/dead-freight, Pages, release v1.0.0
