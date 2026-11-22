# constructivist photomontage plates. canvas overlays carry all text and numbers.
CHAR = {}
SHEET_STYLE = ''
P = {
 # cold open
 'delivery': dict(prompt="A delivery cyclist with an insulated backpack and a stack of cardboard parcels races diagonally across a New York street of brownstones; a giant price tag cut-out swings above him; red rays burst behind."),
 'phone': dict(prompt="A hand holding a smartphone whose screen shows only a blank red alert banner shape (no text), over a collage of cardboard boxes and a city skyline cut-out; black wedges and a cream ray."),
 'cityhall': dict(prompt="New York City Hall's columned facade as a halftone photo cut-out, a vintage megaphone pointed outward from its steps, a crowd silhouette below; bold red diagonal band."),
 'charity': dict(prompt="A collage: an ordinary older couple at a kitchen table reading a brokerage statement, while a giant hand reaches down from the top of the frame and lifts coins out of a jar beside them; red and black geometry."),
 # title
 'title': dict(prompt="An abstract title background: a large hammer and sickle in red on cream, black radiating wedges, a halftone factory and crowd cut-out along the bottom edge, lots of open flat space in the upper centre for a title to be added later."),
 # not the argument
 'net': dict(prompt="A literal safety net strung beneath a high wire, with several halftone cut-out figures of ordinary people of different ages caught safely in it; bold red circle behind; black diagonal."),
 # menu
 'menu': dict(prompt="A dense constructivist collage of price-control symbols: a padlock on an apartment door, a ration card shape, a crossed-out price tag, a factory with a red flag, a stamped official form, all arranged on red and black wedges."),
 # deadweight and roof
 'sweater': dict(prompt="Two halftone hands exchanging a wrapped gift; beside them the unwrapped lumpy knitted sweater, and a small cut-out of three coins dissolving into smoke; red and cream geometry."),
 'roofer': dict(prompt="A halftone photo cut-out of a woman roofer kneeling on a pitched shingle roof with a hammer, and a homeowner below shaking her hand up the ladder; a bold red diagonal and a cream sun ray."),
 'leak': dict(prompt="Inside a bare room, water drips from a stained ceiling into a metal bucket; an empty ladder leans unused against the wall; the roofer's tool belt lies abandoned; stark black and red shapes."),
 # rent control
 'landlord': dict(prompt="A halftone cut-out of an ordinary elderly landlord in a cardigan at a small table with bills and a calculator, looking worried; behind him a red wedge and a cut-out of a brick apartment building."),
 'stuck': dict(prompt="A young mother with a baby looks out of the window of a cramped apartment toward a distant cut-out of a factory and a train on a bridge, heavy black chains drawn across the window frame; red diagonal."),
 'condos': dict(prompt="An old brick apartment building half wrapped in scaffolding being converted, a wrecking ball cut-out swinging toward its corner, a sleek new glass building cut-out rising beside it; red and black geometry."),
 'economists': dict(prompt="A lecture hall of halftone economists in suits from different decades, almost all with arms folded, one lone hand raised; a large red circle behind them."),
 # gift card / sublet / cash
 'giftcard': dict(prompt="A giant blank plastic gift card cut-out slanting across the frame like a monument, small halftone figures of families queuing at its base; red rays and black wedges."),
 'sublet': dict(prompt="A tenant handing a set of keys to another person in a doorway, moving boxes stacked behind; a large official rubber stamp shape descends from above like a hammer; red and black."),
 'cashmarket': dict(prompt="A mother and two children at a rural East African market stall buying school shoes and exercise books with paper cash, smiling; halftone photo cut-out on a cream and red sunburst."),
 'dividend': dict(prompt="A row of identical plain envelopes fanning out from a central point toward many halftone cut-out hands of people of all ages and backgrounds; bold red rays."),
 # parade
 'lottery': dict(prompt="A large rotating lottery drum filled with apartment keys, a crowd of halftone figures watching; red and black geometry."),
 'snap': dict(prompt="A supermarket checkout with a cart of ordinary groceries, beside it a steaming hot rotisserie chicken cut-out sealed behind a bold red diagonal bar; cream background."),
 'parking': dict(prompt="An aerial halftone photo of a city street with both curbs packed with parked cars, a single pedestrian with a stroller squeezed between them; red and black wedges."),
 'grocery': dict(prompt="A small municipal grocery store facade with a plain striped awning and a completely blank signboard with no lettering of any kind, a red flag on a short pole above it, a queue of shoppers outside; constructivist rays."),
 'bus': dict(prompt="A city bus at a stop, passengers of all kinds boarding, an open fare box shown empty; a red diagonal band and a black circle."),
 'port': dict(prompt="A container port with stacked shipping containers and a gantry crane, a giant black padlock cut-out hanging from the crane hook; red sky wedge."),
 # surge
 'airport': dict(prompt="Night at an airport arrivals curb: a crowd of stranded travelers with suitcases, one parent holding a sleeping child, a few ride-share cars with headlights glowing; departure board shapes with no text; red and black geometry."),
 'happyhour': dict(prompt="A bar counter in late afternoon with a few drinks and an empty row of stools, a large clock face cut-out showing four o'clock; cream and red."),
 # critics, trickle-down
 'sawnet': dict(prompt="Two men in suits sawing through the ropes of a safety net while ordinary people stand on it; a bold red diagonal; halftone photo cut-outs."),
 'champagne': dict(prompt="A tall champagne glass pyramid, a bottle pouring into the top glass, the lower glasses mostly empty; halftone photo cut-out on black and red wedges."),
 # theorem and taxes
 'gears': dict(prompt="A machine of interlocking gears and pipes distributing loaves of bread evenly into many outstretched hands, like an engineering diagram brought to life; red and cream."),
 'factory': dict(prompt="A brick factory with tall smokestacks pouring grey smoke over a row of small houses, a woman pulling grey laundry off a line; red sun wedge."),
 'lot0': dict(prompt="An empty fenced grassy lot in open countryside with one young tree, wide sky, a quiet road; cut-out halftone style with red and cream geometric sky bands."),
 'lot1': dict(edit='lot0', prompt="Add a new small train station and a short commuter train right across the road. Keep the empty lot exactly the same."),
 'lot2': dict(edit='lot1', prompt="Years later: a dense busy neighborhood of shops, apartment blocks and a hospital surrounds the lot, which stays exactly the same, still empty grass behind its fence with the one tree."),
 # marginal vs effective
 'cliff': dict(prompt="A tired single parent holding a child's hand stands at the edge of a sheer cliff drawn as a staircase that suddenly drops away; a bold red diagonal; halftone cut-out."),
 'paycheck': dict(prompt="A worker's hand holding a pay envelope while several other hands reach in from the edges and pull most of the bills out; red and black wedges."),
 'friedman': dict(prompt="A 1960s economist's desk with a typewriter, a pipe in an ashtray and stacked books, a chalkboard of supply-and-demand curves behind (no writing); no people; red ray."),
 # close
 'night': dict(prompt="A New York street at night, a delivery cyclist under a streetlight, apartment windows glowing, a large red circle like a setting sun behind the skyline; black wedges."),
}

LIB = 'Style: luminous, optimistic full-color documentary photomontage, warm golden-hour daylight, rich natural color, clean modernist composition with a few bold geometric color bands in sky blue and gold, hopeful and beautiful. Full-bleed 16:9 frame, edge to edge. No text, no words, no letters, no logos, no watermarks. No real, recognizable public figures.'
P.update({
 'colloquium': dict(style=LIB.replace('full-color','sepia-toned 1930s archival').replace('golden-hour daylight','soft window light'), prompt="A 1938 Paris meeting room: a long table with papers, ashtrays and coffee cups, a dozen men in period suits seen from behind and in soft focus, tall windows onto Paris rooftops. No faces in sharp focus."),
 'liberty': dict(style=LIB, prompt="The Statue of Liberty at sunrise seen across the harbor, and far beyond on the horizon a modern landscape of wind turbines, a solar field and the cooling towers of a nuclear plant gleaming in the morning light."),
 'pride': dict(style=LIB, prompt="A joyful pride march down a city street lined with vivid painted murals, rainbow flags, two older men holding hands, families and children, confetti in the golden light."),
 'energy': dict(style=LIB, prompt="A sweeping landscape: rows of solar panels in the foreground, wind turbines on a ridge, a clean nuclear power plant with cooling towers in the distance, a high-speed train crossing a bridge, golden hour."),
})
P.update({
 'lamp': dict(prompt="An ornate antique brass table lamp with a fringed shade, standing alone on a pedestal like a museum piece, with a giant blank price tag hanging from it on a string; a small crowd of halftone figures looks on, unimpressed; bold red rays and black wedges."),
 'house': dict(prompt="A modest single-family house with a porch, a family visible through the window; in front of it a halftone hand extends a huge stack of banknotes toward the front door, which stays closed; red sunburst and black geometry."),
})
P.update({
 'pipe': dict(prompt="A long industrial pipe running diagonally across the frame from a cluster of tall buildings on the left to a row of small houses on the right; coins travel through it and spill out of several cracks and holes along the way, falling and scattering below; a halftone worker with a wrench reaches toward one of the leaks; bold red rays and black wedges."),
 'lighthouse': dict(prompt="A lighthouse on a rocky headland sweeping a strong beam across a dark sea, several small fishing boats of different sizes all guided by the same light; bold red rays and black geometric sky."),
})
