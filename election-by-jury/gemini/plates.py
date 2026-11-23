# constructivist photomontage plates (ultramarine / ochre / cream). canvas overlays carry all text and numbers.
CHAR = {}
P = {
 # cold open
 'walkout': dict(prompt="A small county government hearing room seen from behind the dais: nine anonymous silhouetted figures in office clothes filing out through a tall doorway, several chairs left pushed back and askew, a microphone on the table in the foreground; ultramarine wedge and ochre ray."),
 'memo': dict(prompt="Extreme close-up of a hand sliding a folded paper note across a wooden hearing table toward another hand, a microphone and a nameplate shape (blank) nearby; halftone photo cut-out over an ultramarine diagonal band."),
 'dais': dict(prompt="An empty modern American county government hearing dais: a long curved wooden desk with seven empty office chairs, seven small microphones and seven blank nameplates, five of the seats lit by bold ochre spotlight beams from above; ultramarine background with black wedges. No people, no workers, no megaphones, no flags."),
 'title': dict(prompt="An abstract title background: a giant brass lottery drum full of paper name slips, tilted on a diagonal, ultramarine and ochre rays bursting from it, a halftone crowd cut-out along the bottom edge, lots of open flat cream space across the upper centre for a title to be added later."),
 # two jobs
 'scales': dict(prompt="A large balance scale in halftone: one pan holds a cut-out of a human heart shape, the other an open book; ultramarine circle behind, ochre wedges, cream paper."),
 # competence
 'crowd': dict(prompt="An enormous faceless halftone crowd seen from above, funnelling toward a single small ballot box at the bottom of the frame, paper ballots fluttering like confetti; ultramarine and ochre radiating wedges."),
 'needle': dict(prompt="A single tiny voter figure holding one paper ballot, standing in front of a vast wall made of millions of identical ballots stacked like bricks; a thin ochre ray picks out the lone figure; ultramarine shadows."),
 'homework': dict(prompt="A tired worker at a kitchen table late at night, a stack of political flyers and a thick voter guide unopened beside a clock showing late hour (no numbers), a sleeping child's drawing on the fridge; halftone cut-out on ultramarine and black geometry."),
 'billboard': dict(prompt="A towering roadside billboard made of a giant blank halftone face with a wide smile, tiny pedestrian figures looking up at it, a stack of cash cut-outs propping it up; ochre and ultramarine diagonals."),
 'feed': dict(prompt="A wall built from dozens of glowing smartphone screens, each showing a different distorted halftone eye or mouth, a lone person standing in front of it bathed in blue light; ultramarine dominant, ochre accents."),
 # alignment
 'turnout': dict(prompt="A short line of voters entering a polling place doorway; behind them, a much larger crowd of people of all ages ghosted out in pale cream halftone, as if missing; ultramarine sky wedge, ochre ground band."),
 # mechanism
 'drum': dict(prompt="A hand drawing a single paper slip from a spinning brass lottery drum, slips flying out, bold ochre rays burst from the drum against ultramarine; halftone cut-out."),
 'jurybox': dict(prompt="A wooden jury box filled with about fifteen ordinary citizens of very different ages, races and walks of life, attentive and leaning forward, dramatic light from above; bold ultramarine and ochre diagonals behind them."),
 'lectern': dict(prompt="Four candidates in suits standing at four identical lecterns in a row, each with an old-fashioned chess clock beside it, seen from the jury's point of view; ultramarine floor, ochre spotlights, black wedges."),
 'ballot': dict(prompt="A juror's hand sliding a folded paper ballot into a slotted wooden box, extreme close-up, halftone, with an ochre circle behind and ultramarine wedge."),
 # watching
 'auditorium': dict(prompt="A large debate auditorium audience seen from the stage, hundreds of people holding up voting paddles, split down the middle into two tones; two speakers' podiums silhouetted in the foreground; ultramarine and ochre."),
 'courtroom': dict(prompt="A courtroom seen from the gallery: prosecutor and defence attorney facing each other before a judge's bench, the jury box lit in ochre; ultramarine wedges and black geometry."),
 # competence objection
 'surgeons': dict(prompt="A patient in a hospital gown sitting on an exam table, listening to two surgeons in scrubs who are explaining with gestures; halftone cut-outs on an ultramarine circle with ochre rays."),
 'literacy': dict(prompt="A 1950s-style printed test booklet on a desk with a heavy padlock and chain across it, an official's hand with a rubber stamp hovering above; stark black, ochre and ultramarine."),
 # sample size
 'ladle': dict(prompt="A ladle dipping a single spoonful out of an enormous steaming pot of soup, the spoonful glowing ochre; ultramarine background with radiating wedges; halftone photo cut-out."),
 'scorecard': dict(prompt="A paper ballot with rows of empty bubbles laid on a desk, a pencil filling one in, beside a small stack of identical ballots; ochre and ultramarine geometric shapes, cream paper."),
 'bribe': dict(prompt="A shadowy hand offering an envelope of cash toward a jury box while a second hand, in the foreground, lifts a telephone receiver; noir lighting, ultramarine and black, a single ochre ray."),
 # history
 'athens': dict(prompt="An ancient Athenian kleroterion, a carved stone allotment machine with rows of slots holding small bronze name tokens, citizens in himations standing around it; ochre stone against ultramarine sky wedges; halftone."),
 'venice': dict(prompt="A young boy in Renaissance dress drawing a small ball from a large urn in an ornate Venetian council hall, robed councillors watching, a window cut-out showing gondolas and a canal; ultramarine and ochre geometry."),
 'wells': dict(prompt="A 1900s street orator in a bowler hat shouting from a wooden soapbox, nearly buried by a blizzard of flying newspapers and handbills, a crowd below; ultramarine and ochre diagonals, halftone."),
 # georgia
 'courthouse': dict(prompt="A classic small-town Southern county courthouse with white columns and a clock tower (no numerals), tall pine trees, a few citizens on the steps; halftone cut-out on ochre sun rays and ultramarine sky."),
 'taxappeal': dict(prompt="A homeowner seated at a hearing table facing three ordinary citizens on a small board, a property tax bill and a house photo between them; halftone on ultramarine and ochre wedges."),
 'water': dict(prompt="A tall municipal water tower and a tangle of large pipes in a Georgia landscape, with a giant judge's gavel cut-out floating beside it; ultramarine and ochre geometry."),
 'dam': dict(prompt="A 1930s hydroelectric dam with water pouring through its spillway and power lines marching away across a lake, small workers on top; ochre rays and ultramarine wedges, halftone."),
 'schoolhouse': dict(prompt="A mid-century brick Southern schoolhouse with children on the steps, paper ballot slips drifting down over it like falling leaves; ultramarine and ochre geometry, halftone."),
 'commission': dict(prompt="An all-white group of 1960s county officials in suits around a table with a ledger of names, seen in cold halftone, while Black citizens stand outside a window looking in; heavy black shadows, ultramarine, a thin orange line."),
 'statewide': dict(prompt="A map-like grid of thousands of tiny identical halftone portraits of diverse Georgians, a single ochre highlight square picking out a few at random; ultramarine background."),
 # henry county
 'cramped': dict(prompt="A tiny cramped windowless office with a folding table, five chairs jammed together, and a dark unused video camera on a tripod in the corner with its cap on; harsh overhead light, ultramarine walls, ochre wedge."),
 'scissors': dict(prompt="A pair of giant scissors cutting a budget ledger and a camera cable in half, coins spilling; ultramarine and black, ochre accent."),
 'scale2': dict(prompt="A magnifying glass held over a personnel file and an old dated employment photograph, a gavel resting beside it; halftone, ochre circle, ultramarine wedge."),
 # rewrite
 'capitol': dict(prompt="The Georgia State Capitol in Atlanta: a single neoclassical building with a columned portico and one tall gold-leaf dome topped by a small statue, no side wings, in halftone against an ultramarine sky; a giant hand holding a pen rewriting a page of legal text in the foreground; ochre rays."),
 'eraser': dict(prompt="A close-up of a printed legal document where a pink eraser held in a hand is rubbing out one line, eraser crumbs scattering; ultramarine and ochre geometry around it; halftone. No other people, no workers, no machinery."),
 'nameplate': dict(prompt="A hand unscrewing a blank brass nameplate from an office door in a county building corridor; dramatic light, ultramarine and black, ochre accent."),
 'pen': dict(prompt="A fountain pen signing at the bottom of a document on a wooden desk, an official seal shape beside it (blank), seen from above; ultramarine and ochre geometry."),
 # proposal / close
 'proposal': dict(prompt="A triumphant composition: a jury of about twelve diverse contemporary-looking American citizens of different ages and races, in ordinary everyday clothes, standing on a diagonal ochre platform; a single official in a suit steps forward from them toward a small-city American town hall with a clock tower; ultramarine rays. No factories, no flat caps, no workers' uniforms."),
 'chairs': dict(prompt="Twelve empty wooden jury chairs in a row in a courtroom, raking golden light from tall windows, dust in the air; ultramarine shadows, ochre light, halftone."),
}
