# DEAD FREIGHT progress
Identity: physical train handling on a top-down rail network. Two levers (brake left, throttle right), reverser, tap points.
Weight -> slower accel, longer braking (stop marker), grades/stall + wheelslip, fragile cargo, couple speed.

## Done
- repo init
- Vertical slice DONE and verified by tests/test_slice.py (34/34, Pixel 7 + iPhone 13, real CDP touches on levers/buttons)
- modules: track, map, train, sim, art, render, audio, input, ui, game, save, data, rng

## Next
- art polish (look at screenshots), more tests (mechanics, menus, modes, save, layout, http/offline)
- PWA manifest+sw+icons, build.py dist, README, deploy
