# Gemini plates for "the free-market case for just giving people cash". name -> dict(prompt, who=[sheets], ref=[plates], edit=base plate)
# Canvas overlays (numbers, arrows, charts, labels) are drawn on top in src/main.js, so plates carry no text.
CHAR = {
 'sheet_maya': 'MAYA, the tenant',
 'sheet_walt': 'WALT, the landlord',
 'sheet_dana': 'DANA, the roofer',
 'sheet_sam': 'SAM, the homeowner',
}
SHEET_STYLE = ("Character reference sheet on a plain warm cream background: the same person shown three times side by side, full body front view, "
               "three-quarter view, and a head-and-shoulders close-up, neutral friendly expression. Warm hand-drawn editorial illustration, confident ink "
               "linework with loose watercolor washes, realistic adult proportions. No text, no labels, no letters.")
M = 'MAYA (the tenant, character sheet)'; WA = 'WALT (the landlord, character sheet)'; D = 'DANA (the roofer, character sheet)'; SA = 'SAM (the homeowner, character sheet)'
BLDG = "a handsome three-storey red-brick walk-up apartment building with a green front door, stone stoop, bay windows and a fire escape, on a leafy city street"
LOT = "a small empty grassy city lot with a low chain-link fence and one young tree, seen from across the street at a slight elevation"
P = {
 # characters
 'sheet_maya': dict(prompt="MAYA: a Black woman about 30, natural hair pulled back, mustard-yellow cardigan over a white tee, dark jeans, canvas tote bag, warm and practical."),
 'sheet_walt': dict(prompt="WALT: a white man about 70, an ordinary retiree landlord (not a villain): thinning grey hair, reading glasses, a worn navy cardigan over a plaid shirt, slightly stooped, kind tired face."),
 'sheet_dana': dict(prompt="DANA: a Latina woman about 45, strong and capable roofer: sun-weathered face, dark hair in a braid under a red bandana, teal work shirt with rolled sleeves, tan canvas work pants, tool belt, work gloves."),
 'sheet_sam': dict(prompt="SAM: an East Asian man about 38, friendly homeowner: short black hair, round glasses, sage-green sweater, khakis."),
 # cold open
 'bldg': dict(who=['sheet_maya'], prompt=f"Daytime street view of {BLDG}. MAYA ({M}) stands on the stoop holding a set of keys, smiling with relief, a cardboard moving box at her feet. Leave the sky in the upper left fairly open and calm."),
 'tenant': dict(who=['sheet_maya'], ref=['bldg'], prompt=f"Inside a sunny, modest apartment with tall bay windows and hardwood floors: MAYA ({M}) sets a moving box down and looks around, delighted. Plants on the windowsill."),
 'landlord': dict(who=['sheet_walt'], ref=['bldg'], prompt=f"WALT ({WA}) sits at his small kitchen table at dusk with a stack of bills, a calculator and a mug, looking worried; through his window, across the street, the red-brick apartment building he owns."),
 'street': dict(ref=['bldg'], prompt="High wide view of a long city street lined with many different apartment buildings of brick, stucco and clapboard, seen from above at golden hour. One red-brick walk-up building with a green door in the middle of the row is lit by a single warm spotlight beam from the sky, as if picked at random; the rest are in soft shade."),
 'pipe': dict(prompt="A whimsical but grounded illustration: a long, old copper pipe runs from a stately city hall on the left to a small family's front door on the right; gold coins travel inside it and many of them leak out of cracks and holes along the way, falling into puddles below. Calm sky above."),
 # why help
 'diptych': dict(prompt="A split image, two side-by-side scenes divided down the middle: left, a tired mother at a supermarket checkout carefully counting a few bills while her small son holds a carton of milk; right, a wealthy man on the deck of a gleaming yacht, absent-mindedly letting a bill flutter away in the wind."),
 'bernoulli': dict(prompt="An 18th-century mathematician in a powdered wig and a dark coat writes by candlelight at a cluttered wooden desk in a Basel study, quill in hand, papers covered in curving graphs (no legible writing), a globe and books beside him, night outside the window. Leave the right half of the frame softly lit and uncluttered."),
 # deadweight loss
 'gift': dict(who=['sheet_sam', 'sheet_maya'], prompt=f"In a cozy living room with a decorated tree, SAM ({SA}) beams as he hands MAYA ({M}) an unwrapped, rather ugly lumpy orange-and-green knitted sweater; MAYA holds it up with a forced, polite smile, eyebrows slightly raised."),
 'gifts': dict(prompt="A heap of unwanted holiday gifts on a table after the holidays: novelty mugs, a lumpy ceramic frog, ugly sweaters, scented candles, a fondue set, torn wrapping paper and ribbons, a few gift receipts. Warm lamplight, slightly melancholy and funny."),
 'bill': dict(prompt="Close-up of one hand passing a crisp ten-dollar bill to another open hand, in warm light, simple soft background; no legible numbers or text on the bill."),
 # trade
 'fence': dict(who=['sheet_dana', 'sheet_sam'], prompt=f"Two neighbors shake hands over a low wooden fence between their back yards on a sunny morning: DANA ({D}) and SAM ({SA}), both smiling. A ladder leans against Sam's house behind him."),
 'roof': dict(who=['sheet_dana', 'sheet_sam'], prompt=f"A modest two-storey house with a worn shingle roof that has a patch of missing shingles. DANA ({D}) kneels on the roof with a hammer and a stack of new shingles, working; SAM ({SA}) stands on the lawn below looking up, giving a thumbs-up. Clear sky above the roof."),
 'leak': dict(who=['sheet_sam'], prompt=f"Inside the upstairs bedroom of a modest house during a rainstorm: water drips through a stain in the ceiling into a metal bucket on the floor; SAM ({SA}) stands beside it with arms folded, glum. Rain streaks the window."),
 # how we help
 'voucher': dict(who=['sheet_maya'], prompt=f"MAYA ({M}) stands in a hallway of a plain apartment building holding a single official-looking form (no legible writing) and looks at a row of identical beige doors, most marked with a small red X tag and one with a small green tick tag, puzzled."),
 'parking': dict(prompt="A city street with both curbs lined bumper to bumper with parked cars, while a woman on a bicycle and a man walking with a stroller squeeze along a narrow strip between them. Sunny, slightly crowded, gently comic."),
 'stuck': dict(who=['sheet_maya'], ref=['tenant'], prompt=f"MAYA ({M}) sits by the bay window of her apartment holding a letter (no legible writing) and looking out at a distant city skyline across a bridge, torn; behind her the apartment is a little cramped now, boxes stacked, a crib squeezed in a corner."),
 'condos': dict(prompt="A row of colorful Victorian townhouses on a steep San Francisco-style hill; one is wrapped in scaffolding being converted, with workers and a fancy new glass-and-steel extension; a blank real-estate sign post with no writing stands out front."),
 'grocery': dict(prompt="A father and two kids at a supermarket checkout with a cart overflowing with ordinary groceries: produce, milk, bread, cereal; the father pays with a plain card at the terminal and the kids help bag. Warm, dignified, everyday."),
 'cash': dict(prompt="A rural market in East Africa on a bright day: a mother with two children buys a pair of school shoes and exercise books from a stall, paying with cash, smiling; goats and bicycles in the background."),
 'lighthouse': dict(prompt="A lighthouse on a rocky headland at dusk sweeping its beam over a dark sea, several small fishing boats of different sizes all guided by the same light."),
 # theorem
 'blueprint': dict(prompt="An engineer's drafting table seen from above at a slight angle, with a large blueprint showing a technical cutaway drawing of a pie divided into slices, with pipes and valves routing slices to small houses; drafting tools, a compass, pencils, a coffee mug. No legible writing or numbers."),
 # taxes
 'factory': dict(prompt="An old brick factory with tall smokestacks pouring grey smoke that drifts over a row of small houses next door, where a woman frowns at freshly hung white laundry turning grey; a man coughs on his porch."),
 'lot0': dict(prompt=f"Daytime: {LOT}, surrounded by mostly open fields and a quiet two-lane road, a few scattered houses far away. Wide view with lots of sky."),
 'lot1': dict(edit='lot0', prompt="Add a brand-new small commuter train station with a platform and a short train right across the road from the lot, and a few new sidewalks. The empty lot itself stays exactly the same."),
 'lot2': dict(edit='lot1', prompt="Years later: the area around the lot is now a busy neighborhood: shops with awnings, a small hospital building, apartment blocks, trees, people walking, cyclists. The empty lot itself stays exactly the same, still empty grass with the low chain-link fence and the one tree, now surrounded by the city."),
 'lot3': dict(edit='lot2', prompt="Add the lot's owner, a man in a sun hat, dozing in a folding lawn chair in the middle of the empty lot with a lemonade beside him."),
 # dividend
 'checks': dict(prompt="A wide view of a street of very different homes: a small apartment, a farmhouse, a big suburban house, a trailer, a townhouse; at each mailbox a different person (old, young, of many backgrounds) happily pulls out an identical pale-green envelope. Sunny morning."),
 'desk1962': dict(prompt="A 1960s economics professor's office: a wooden desk with a typewriter, a pipe in an ashtray, stacks of books and a chalkboard behind covered in supply-and-demand diagrams (no legible writing), warm afternoon light through venetian blinds. No people."),
 'family': dict(who=['sheet_dana'], prompt=f"Evening in a warm, modest kitchen: DANA ({D}), still in her work clothes, comes home and hugs her teenage son at the table, where homework is spread out; a pot steams on the stove. Tired but happy."),
 'end': dict(who=['sheet_maya', 'sheet_walt'], ref=['bldg'], prompt=f"Golden hour on the same street: MAYA ({M}) and WALT ({WA}) sit together on the stoop of the red-brick building with the green door, laughing and sharing a pot of coffee, relaxed. Leave the sky open and calm."),
}
