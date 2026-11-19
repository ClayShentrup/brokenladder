#!/usr/bin/env python3
"""v5 story fixes plus the explainer coda: edits src/script.json and sources/story.txt."""
import json, re
P = 'src/script.json'; s = json.load(open(P)); L = {l['id']: l for l in s['lines']}
NAMES = ['julian', 'henrik', 'munich', 'langley', 'vienna', 'kessler', 'zurich', 'antwerp', 'bayernhof', 'lindenhof']
def say(t):
    t = t.replace('—', ', ')
    t = re.sub(r'\btalstrasse\b', 'Tahl-strasse', t); t = re.sub(r'\bdufourstrasse\b', 'Doo-foor-strasse', t)
    for n in NAMES: t = re.sub(r'\b' + n + r'\b', n.capitalize(), t)
    t = re.sub(r"\bi\b", 'I', t)
    t = re.sub(r'(^|[.?!]\s+|^"|[.?!]\s+"|[.?!]"\s+|: ")([a-z])', lambda m: m.group(1) + m.group(2).upper(), t)
    return t
EDIT = {
 'S11': "kessler—the station chief in munich—had been found forty-eight hours ago in the trunk of a rented audi at the central train station, his throat opened with a surgical precision that left zero blood on the upholstery. the forensic file was restricted to the three-person investigation cell in langley. the cover story fed to the bavarian press was a coronary in his apartment. no one outside the langley cell knew kessler had died at the station, and no one outside the cell knew his killers had staged out of the bayernhof hotel and wiped their room clean on the way out.",
 'S12': "henrik wasn't cleared for that file. henrik was a mid-level logistics coordinator in vienna. there was no world in which henrik knew about the bayernhof, unless he had been the one who cleared it.",
 'S31': "he watched henrik’s eyes. if the pouch is real, you still have to drop it, so you say \"fine, i'll run it down myself and meet you at the top.\" if it was only ever an excuse to stay at my side, you forget it exists and herd me right back up these stairs.",
 'S45': "if julian thinks henrik is a clumsy liar who believes his cover is still intact, julian will try to be clever: he'll pretend to go along with the \"let's get a drink\" charade, climb the stairs ahead of henrik, and use that head start to reach the open ground of the park first, where he can turn and fight on level footing or bolt into the dark.",
 'S46': "and that's the trap, julian realized, the coldness in his chest suddenly total. if henrik told that lie on purpose, then he knows i know he's hunting me, and he knows the only reason i would ever agree to climb these stairs is to set up a counter-ambush. so the second i turn my back and put my weight on the first step—trapped between two stone walls with my balance pitched forward—he won't wait for the top of the hill. he'll put a bullet in my back immediately.",
 'S47': "julian looked at henrik's coat. henrik's right hand was buried deep in the wool slash pocket, just as it had been since he'd offered to walk julian down. his left hand held the empty paper espresso cup.",
}
for k, v in EDIT.items():
    L[k]['text'] = v; L[k]['say'] = say(v)
S48 = L['S48']; add = " and turning to walk back down the alley meant giving henrik his back just the same."
if add.strip() not in S48['text']:
    S48['text'] = S48['text'] + add; S48['say'] = say(S48['text'])
# explainer coda
EX = [
 ('E00', "stay tuned for an explainer of what you've just watched.", 1.6),
 ('E01', "in game theory, something is common knowledge when everyone knows it, everyone knows that everyone knows it, and so on, forever. the story you just watched climbs that ladder one rung at a time. as long as any rung is uncertain, both men can keep pretending. once every rung is filled in, the pretending is over.", 0.9),
 ('E02', "level one: julian knows henrik is the killer. henrik mentions clearing the hotel in munich, a detail only the killer or the three-person langley cell could know, and henrik is a logistics coordinator in vienna, not on the cell.", 0.9),
 ('E03', "level two: henrik knows that julian knows. right after the slip, julian suddenly remembers a token in his car on talstrasse and peels away, and henrik reads that for what it is.", 0.9),
 ('E04', "level three: julian knows that henrik knows that julian knows. henrik invents a pouch drop at the annex on talstrasse to stay at julian's side. when julian cancels the trip, a man with a real pouch would still have to deliver it. henrik forgets it ever existed and steers straight back to the stairs. the errand was a leash. from here on, neither man is fooled about anything basic: the drink at the top is a pretext to get somewhere dark and settle it.", 0.9),
 ('E05', "level four is what's at stake at the bottom of the stairs. does henrik know that julian saw through the talstrasse lie? the real annex is on dufourstrasse, and julian once worked there. whether henrik knows that depends on whether he pulled julian's real file.", 0.9),
 ('E06', "if he didn't, henrik thinks julian took the errand at face value, the nervous move of a rattled colleague. so he expects julian to climb, hoping to use his head start and the open ground at the top to turn the tables. henrik's move: play along all the way up, and strike in the dark under the trees.", 0.9),
 ('E07', "if he did, henrik told the lie knowing julian would catch it. then henrik knows julian sees him as composed and dangerous, and the only reason julian would ever start up those stairs is to fake compliance and spring a counter-ambush. henrik's move: don't wait for the top. shoot julian in the back the instant he turns to take the first step.", 0.9),
 ('E08', "julian can't tell which world he's in, but he doesn't need to. climbing loses in both, and so does turning his back to walk away. so he stays where he is, facing henrik.", 0.9),
 ('E09', "the espresso line is a test. telling henrik that the machine in the dufourstrasse basement has been broken since twenty-three proves julian worked at the real annex and knew the lie was garbage the whole time. the two worlds predict opposite reactions. in world one, it's news, and henrik's eyes should widen in shock. in world two, it isn't news, and all he's lost is the bait.", 0.9),
 ('E10', "henrik's eyes don't widen. the smile switches off, and he looks mildly disappointed. \"i figured you'd spot that.\" level four was true.", 0.9),
 ('E11', "now every level is filled in, and both men know it. there's nothing left to bluff about, so the cover stories have no more use. no more pretending. the cup drops.", 3.0),
]
s['lines'] = [l for l in s['lines'] if not l['id'].startswith('E')]
L['S61']['gap'] = 6.5
for i, t, g in EX: s['lines'].append({'id': i, 'text': t, 'say': say(t), 'gap': g})
json.dump(s, open(P, 'w'), indent=1, ensure_ascii=False)
# story file: rewrite edited paragraphs
st = open('sources/story.txt').read().split('\n')
key = {'S11': 'kessler—the station chief', 'S12': "henrik wasn't cleared", 'S31': 'he watched henrik’s eyes', 'S45': 'if julian thinks henrik is a clumsy liar',
       'S46': "and that's the trap", 'S47': "julian looked at henrik's coat", 'S48': 'julian weighed the two worlds'}
for k, pre in key.items():
    idx = [n for n, p in enumerate(st) if p.startswith(pre)]; assert len(idx) == 1, k
    st[idx[0]] = L[k]['text']
open('sources/story.txt', 'w').write('\n'.join(st))
for k in list(EDIT) + ['S48', 'E04']: print(k, '|', next(l for l in s['lines'] if l['id'] == k)['say'][:160])
