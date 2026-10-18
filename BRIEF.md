# DEAD FREIGHT - original brief (from the user)

Premise: The railway closed thirty years ago. Nobody bothered telling the trains. You operate a battered maintenance locomotive out of a forgotten industrial depot. Beyond lies a sprawling network of abandoned freight cars, disconnected factories, overgrown sidings, broken junctions, and cargo someone still wants delivered. Each shift you venture out, recover freight, and return to the depot. Limited fuel, modest pulling power, questionable maintenance history. Every car you attach changes the journey. Deeper = more valuable salvage. Getting it home is the hard part. Grounded, atmospheric, slightly strange, full of personality. NO supernatural, NO AI storylines, NO generic post-apocalyptic cliches, NO horror tropes. History emerges through the environment.

Creative challenge: pick ONE strong gameplay identity (route planning / arcade driving / logistics / exploration / physical train handling / puzzles or an original combo) and execute it exceptionally. Immediately understandable, satisfying to control, rewarding to master. Meaningful decisions. Success depends on skill, not luck or waiting for automated events.

Core loop (all required): 1) leave home depot aboard locomotive 2) navigate a railway network 3) discover/locate freight 4) physically or logically couple cars 5) freight affects movement/routing/capacity/etc 6) return to depot with freight 7) rewards based on outcome 8) improve capabilities, attempt harder runs. Player has genuine control; clear success vs failure.

Signature mechanic: the train gets harder to manage as it grows. Lone loco easy. Pick a small set of consequences (braking distance, acceleration, fuel use, siding capacity, reversing, weight limits, cargo instability, junction management, coupling order, traction on grades). Learnable, masterable, not frustrating realism. Fun to operate.

World: explorable industrial network, home depot + multiple destinations (factories, logging sidings, quarries, grain elevators, repair yards, warehouses, rural stations). Interconnected, distinct visual identities per area, player learns the network. Handcrafted/procedural/hybrid. All objectives reachable, valid topology. Player always knows where they are and where to go.

Touch controls: portrait-first, iPhone/Android, design for 390x844. Invent a fitting scheme (throttle slider, brake lever, switch buttons, track tapping, drag, contextual). Reliable, responsive, intuitive. Touch-first, Pointer Events, no keyboard needed, no hover-only, large readable controls, no page scrolling, safe-area, responsive scaling, reliable pointercancel, clear feedback for every action, desktop mouse for testing, smooth perf. Never rely on automation to solve the primary challenge.

Art: distinctive cohesive identity (detailed pixel / illustrated 2D / stylized low-res). Old industrial machinery, worn paint, steel rails, gravel, rust, grease, forgotten infrastructure, long track. NO neon cyberpunk, holograms, glowing hexagons, placeholder art, emoji. Readable railway, appealing train, atmosphere without hurting readability.

Personality: memorable location names, unusual cargo descriptions, old signage, short radio messages, small environmental details. Concise, understated humor. No long dialogue, exposition, or artificial dramatic narration. The railway has a history worth discovering.

Progression: start modest. Runs give rewards that unlock real improvements (brakes, pulling power, fuel, coupling gear, new areas, or your own). Persist between sessions. Increasingly capable without removing challenge.

Replayability: varied freight requests, changing salvage locations, harder routes, risk vs reward, meaningful upgrades. A structured progression mode AND at least one replayable mode. Daily/contracts/achievements only if they improve it. No ads, energy, IAP, waiting.

Audio/feel: locomotive personality. Sounds for coupling, braking, switches, wheels, engine, collisions, deliveries. Web Audio or local assets. Mute option. Playable silent. Responsive animation and clear feedback. Operating the loco is enjoyable by itself.

Tech: HTML5/CSS/JS(or TS), Canvas etc. Modern mobile browsers, static hosting, no backend/auth/external APIs, local saves, handles resize, background/resume, no runtime errors, offline after first load where practical. Lightweight libs ok. Maintainable.

CRITICAL: before expanding, implement and verify ONE complete vertical slice through actual player controls (same input handlers a human uses, no test shortcuts, no idealized sim ignoring input): start at depot -> control loco -> travel to a freight car -> couple -> return to depot -> deliver -> reward -> begin another run. Only then expand.

QA minimum: starts; first mission completable; touch works; loco responds correctly; tracks and junctions consistent; coupling; transport; delivery; rewards correct; upgrades have real effects; save/reload; failure and recovery work; menus work; mobile layout usable; never permanently stuck without a recovery option; no blocking JS errors. Use browser automation. Disclose anything untested. No claims without evidence.

Priorities: 1 actual playability 2 satisfying control 3 interesting decisions 4 fun moment to moment 5 replayability 6 cohesive visuals 7 progression 8 extra features. Compact polished > large broken.

Delivery: full source in workspace, run and test, playable preview/deploy link, downloadable package, concise run/deploy instructions.
