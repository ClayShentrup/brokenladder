#  Burlington Vermont 2009 IRV [mayor](BurlMayors.txt) election 

##  Thwarted-majority, non-monotonicity & other failures (oops) 

By [Anthony Gierzynski](http://www.uvm.edu/~polisci/faculty/gierzynski_bio.html), Wes Hamilton, & [Warren D. Smith](/WarrenSmithPages/homepage/works.html), March 2009.    (skip to summary)    ([ Brian Olson's independent analysis](http://bolson.org/~bolson/2009/20090303_burlington_vt_mayor.html))    ([Return to main page](RangeVoting.html)) 

##  The Propaganda 

Instant Runoff Voting ([IRV](rangeVirv.html)) advocates, especially FairVote's Terrill G. Bouricius  (who lives in Burlington, formerly served there as alderman, also formerly served as a Vermont state legislator, calls himself a "political scientist," was instrumental in making IRV happen in Burlington starting in 2006, is denoted a "senior analyst" by FairVote, and in 2005 received a contract to design Burlington's IRV voter education program), often hail Burlington's adoption of IRV for its mayoral election as a "great success." Bouricius has also contended in various online posts, print media, and interviews that IRV always elects a "majority winner." E.g. 

Claims made by T.G.Bouricius and FairVote (IRV advocates) 

> 1\. Under **instant runoff voting** , if there is no majority winner, you're not done yet. You have a runoff. But instead of calling voters back to the polls, you just declare the bottom candidates defeated, look at those ballots, and transfer those ballots to those voters' second choice. **So you determine which candidate is actually preferred by a majority of voters.** - Terrill Bouricius, January 1999 published interview by Labor Party.   
>   
>  2\. Districts with plurality election laws face the prospect of **"spoiler"** candidates throwing an election to a candidate that is not the most preferred by the majority. **IRV solves [this problem]** and offers additional advantages... IRV also **allows voters to vote their true preference without any need for calculating which candidate has the best chance.** You can vote for the candidate you want most, without any fear that you will inadvertently help elect the candidate you can't stand. - Terrill Bouricius, endorsement letter for IRV in Vancouver.   
>   
>  3\. Burlington's instant runoff voting (IRV) election went off **without a hitch in 2009.** If anything, it was even more successful [than 2006]. **IRV clearly worked as intended to avoid the "spoiler" dynamic**... While Sore losers in Burlington are complaining about sour grapes, instant runoff voting has proven itself again as a bulwark of democracy. - FairVote blog post by Terrill Bouricius 6 March 2009 titled "Some Analysis of the 2009 Burlington IRV Election." This "analysis" contains no mention of any of the numerous pathologies we shall point out below.   
>   
>  4\. The Burlington election was a model of clean, open debate **without "spoiler" concerns**... - FairVote official [press release](FairVoteHuffPostBurlington.png) dated 3 March 2009 titled **"Burlington Holds Second Highly Successful IRV Election."**  
  
---  
  
However, there are [reasons](IrvRevFail.html) to believe otherwise... We shall show by considering Burlingon's 2009 Mayor election that all the claims by Bouricius and FairVote in bold print above are false. 

##  The votes 

This was the second IRV election conducted in Burlington and it was won by Progressive Bob Kiss.  (The other 4 candidates were Andy Montroll[Dem], James Simpson[Green], Dan Smith[Indpt], and Kurt Wright[Repub]. Kiss also won the _first_ election, held in 2006; in [that election](Burlington06.html) Kiss had been both the plain-plurality and IRV winner, and almost certainly also a "beats-all" and [Borda](rangeVborda.html) winner - won by a "landslide" - so there was little basis to dispute his enthronement.) 

[Official](BurlOfficialTallies.html) Burlington Mayoral 2009 IRV race results (election held 3 March) from <http://www.burlingtonvotes.org/20090303/>. 8980 valid ballots (also 4 "invalid" ballots were left uncounted). Smith, Simpson, and Write-ins were eliminated immediately & simultaneously since their "defeat was mathematically inevitable." Then Montroll was dropped. That left Wright vs Kiss in the final round, which was won by Kiss. |  Unofficial Burlington 2009 Mayoral race vote data. Votes [counted](JLburl09.txt) by Juho Laatu. Also counted independently [(pdf)](UVMburl09.pdf) by Univ. Vermont students in the [Vermont Legislative Research Shop](http://www.uvm.edu/~vlrs/) supervised by professor Anthony Gierzynski. (All 8980 ballots included in these counts, but candidates other than Kiss, Wright, and Montroll are ignored.  Further data processing by W.D. Smith. There are _disagreements_ among the Laatu, UVM, and official counts by up to 5 votes. ) |  [Sample ballot [(pdf)](BurlVTmayorIRV.pdf)]   
  
  
  
Pairwise-defeats matrix: entry says how many voters preferred canddt in that row over canddt in that column.   
---|---|---  
| Candidate(Party)| 1st Rd| 2nd Rd| Final  
---|---|---|---  
Bob KISS(Progr)| 2585(29%)| 2981| 4313 (wins)  
Kurt WRIGHT(Repub)| 2951(33%)| 3294| 4061  
Andy MONTROLL(Dem)| 2063(23%)| 2554  
Dan SMITH(Indpt)| 1306(15%)  
James SIMPSON(Green)| 35 (0.4%)  
(Write-ins)| 36 (0.4%)  
| #Voters| Their Vote  
---|---  
1332| M>K>W  
767| M>W>K  
455| M  
2043| K>M>W  
371| K>W>M  
568| K  
1513| W>M>K  
495| W>K>M  
1289| W  
| Canddt| K| M| W  
---|---|---|---  
K| *| 3477| 4314  
M| 4067| *| 4597  
W| 4064| 3668| *  
  
**Remarks on the counts:** Unfortunately, the Official, Laatu, and U.Vermont counts all _disagree_ ; but never by more than 5 votes (which is small enough that none of our conclusions below will be affected, no matter which count you trust). Laatu's count (done by software inputting official ballot files) is the most complete of the three and is the one we shall use below. The official count (which we downloaded various times, the latest on 27 March 2009 from Burlington's web site; it had not changed) was also done by computer using the same input files; but the U.Vermont count was done manually. We believe we understand the reason for the Laatu-vs-Official discrepancy: it is that the official count treated ballots involving equal-rankings in a stupid manner. Specifically, the official method apparently _discarded_ the 4 ballots ranking their top-two candidates equal; but did _not_ discard ballots ranking other candidate-pairs equal. This approach is a holdover from the olden pre-computer days when a ballot had to be put in one or the other pile. Since this election was counted by computer there was nothing stopping the computer from putting _half_ of the vote in _both_ piles. That, it seems to us, would have more-accurately reflected what the voter wanted (versus just discarding her vote entirely). This [subpage](JLburl09.txt) gives full details about these discrepancies (as well as the full set of votes, plus many other calculations, e.g. full pairwise table). 

##  The pathologies 

**1.** According to the pairwise table, Democrat Andy Montroll was favored over Republican Kurt Wright 56% to 44% (930-vote margin) and over Progressive Bob Kiss 54% to 46% (590-vote margin) majorities in both cases. In other words, in voting terminology, Montroll was a **"beats-all winner,"** also called a "Condorcet winner" - and a fairly convincing one. 

However, in the _IRV_ election, Montroll came in _third!_ Kiss beat Wright in the final IRV round with 51.5% (252-vote official margin). 

We repeat: According to the preferences stated by the voters on their ballots, if Montroll had gone head-to-head with either Kiss or Wright (or anybody else) in a two-man race, he would be mayor. This **refutes** Bouricius's claim that IRV "determines which candidate is actually preferred by a majority of voters." 

> Indeed, the electorate expressed a clear ordering among the candidates:  Montroll > Kiss > Wright > Smith > Simpson  with a majority preferring every candidate higher in the ordering, over every candidate lower in it. And the "Montroll vs X" counts were 
> 
>   * Montroll was preferred vs Kiss by a voter Majority, 4067-3477, margin 590. 
>   * Montroll was preferred vs Wright by a voter Majority, 4597-3668, margin 929. 
>   * Montroll was preferred vs Smith by a voter Majority, 4573-2998, margin 1575. 
>   * Montroll was preferred vs Simpson by a voter Majority,6267-591, margin 5676. 
>   * Montroll was preferred vs All Write-Ins Combined by a voter Majority, 6658-104, margin 6554. 
>   * There were no other candidates. 
>   * Note that even Montroll's weakest margin (590 over Kiss) was 7.8% as a percentage, which is a pretty clear win. 7.8% was a greater victory margin than in 6 of the the 7 USA presidential elections 1988-2012. 
> 
IRV elected Kiss, not Montroll, based on Kiss's "majority" (margin 250) versus Wright. 

> Of course it was a huge success! No voting machines exploded or burst into flames. A majority of voters did not suffer from paper cuts.   
>   
>  A majority of the voters expressed a second preference. We'll assume they were glad to have that opportunity.   
>   
>  Hmm, I wonder if the W>M>K voters would be pleased to know that their second choices _weren't counted_ , or that they could have elected M if they had voted for M as their first choice? I wonder if the Montroll supporters would be pleased to know that the voters preferred Montroll over every other candidate - including the winner that IRV chose?   
>  - Jan Kok, responding to FairVote's claims this IRV election had been a "big success" like usual.   
  
---  
  
(Montroll, incidentally, was endorsed by both former VT governor Howard Dean and the _Burlington Free Press._ It is [possible](IRVamp.html) in principle for IRV to yield even more dramatic thwarted-majority pathologies, e.g. X defeating every rival pairwise by 99:1 or larger majorities, yet still IRV eliminates X in its first round.) 

**2.** Despite that, IRV still seems to have performed better in this election than plain [plurality](Plurality.html) voting, which (based on top-preference votes) would have elected Wright. That would have been even worse, since Wright actually was a "lose-to-all loser" among the Big Three, i.e. would have lost head-to-head races versus either Kiss or Montroll. 

Incidentally, [plurality](Plurality.html) also elects Wright with _reversed_ ballots (M,K,W only), i.e. paradoxically regards Wright as _both_ the best winner _and_ worst loser among the Big Three! IRV can [also](IrvRevFail.html) exhibit such "reversal failures" but did not in this particular race. 

**3.** Also, in this IRV election, Wright was a [**"spoiler"**](IRVcs.html); if Wright had not been in the race then Montroll would have won (which the Wright voters would have preferred: 1513 were for Montroll versus 495 for Kiss). Any voters who voted for Wright as their favorite "without any fear of inadvertently electing Kiss" were foolish to lack such fear, because, in fact, if they instead had "calculated" right, they could have strategically voted Montroll and thus avoided electing Kiss. (That's an example of **"favorite-betrayal."**) This **refutes** Bouricius's & FairVote's other claims shown in bold print. 

**4.** Another problem with IRV is the fact that it [cannot](IrvNonAdd.html) be counted in precincts because there is no such thing as a "precinct subtotal." That's bad because it forces centralized (or at least centrally-directed) counting, thus making the election more vulnerable to fraud and communication outages. This election also exhibited this kind of **nonadditivity paradox**. There were 7 [wards](Burl09wards.pdf). Apparently, the ward-winners (if IRV had been done in each ward independently) would have been 

Ward| Ward#1| Ward#2| Ward#3| Ward#5| Ward#6| Ward#7| Ward#4  
---|---|---|---|---|---|---|---  
IRV Winner| KISS| KISS| KISS| MONTROLL| MONTROLL| WRIGHT| WRIGHT  
#Valid Ballots| 836| 691| 1035| 1530| 1225| 1715| 1944  
Total Ballots| 2562| 2755| 3659  
  
Let's just say that it is hard to infer from this that Kiss "should" be the overall IRV winner - most people would guess Wright or Montroll before guessing Kiss, especially if they knew that Wright voters expressed a preference for Montroll over Kiss by more than a 3:1 ratio. 

It is possible in principle for IRV to yield more-dramatic such pathologies, for example X can be the IRV winner in _every_ district, with Y the IRV winner in the whole country. 

**5.** If we assume that the "W" voters who expressed no preference for K>M or M>K are regarded as (really) favoring one or the other with 50% chance - e.g. if "W"s are regarded as half W>M>K and half W>K>M (or any realistic ratio of W>K>M and W>M>K besides 50-50) - then this election also featured (what voting theorists call) a **"[no-show paradox](IRVpartic.html)."** That is: If 753 Wright voters who favored Montroll over Kiss had simply _stayed home_ and refused to vote, they would have gotten, in their view, a better election winner (Montroll) than they got by honestly voting. So for them, a better "calculation" than voting honestly, was _not_ voting! (More [details](BurlResponses.html#noshow).) 

**6.** Finally - and probably craziest of all - this election also featured [**non-monotonicity**](Monotone.html). If 753 of the W-voters (specifically, all 495 of the W>K>M voters plus 258 of the 1289 W-only voters) had instead decided to vote for K, then W would have been eliminated (not M) and then M would have beaten K in the final IRV round by 4067 to 3755. In other words, _Kiss won, but if 753 Wright-voters had switched their vote to Kiss, that would have made Kiss _lose_!_

With non-monotonicity we can be _100% certain_ that IRV _must_ have delivered the "wrong winner" in either the election, or in the altered election got by changing the 753 votes (or both) - there is no way to contend both winners were sensible choices. (And the same sort of remark can also be made about no-show paradox elections.) 

Further false claims made by T.G.Bouricius and FairVote (IRV advocates). 

> In terms of the [frequency](Monotone.html#summary) of **non-monotonicity** in real-world elections: there is **no evidence** that this has **ever played a role in any IRV election** - not the IRV presidential elections in [Ireland](Ireland1990.html), nor the literally thousands of hotly contested IRV federal elections that have taken place for generations in Australia, nor in any of the IRV elections in the United States... Monotonicity has little if any real world impact. - FairVote web page on "monotonicity" downloaded 15 March 2009 and again Feb. 2011 and again July 2013 (still makes this claim).    
>   
>  Burlington just conducted an election for mayor using Instant Runoff Elections. This method quickly produced a candidate with a **majority** vote in a field of **four** candidates. - Letter by Adam Kleppner to _Caledonian Record_ published 13 March 2009 and featured on FairVote web page.  Amazingly enough (which was not mentioned in this letter) _Caleb_ Kleppner is yet another "FairVote senior analyst" and the vice president of TrueBallot, Inc. and co-founder with Bouricius of Election Solutions Inc, both IRV-voting companies.   
  
---  
  
## Who would other voting methods have elected? 

Method| Winner (full vote set)| Winner (M,K,W only)  
---|---|---  
Nanson-Baldwin, Black, [BTR-IRV](BtrIrv.html), Raynaud, Schulze-beatpaths, Simpson-Kramer minmax, Tideman-ranked-pairs, [WBS-IRV](TidemanRev.html#WBSIRV), Copeland, Heitzig-River, Arrow-Raynaud, Borda (if combine all write-in canddts into "one" or omit them), Dodgson, Keener-Eigenvector, Brian Olson's IRNR method, Sinkhorn, Bucklin, and ([probably](AppCW.html)) Range & Approval | MONTROLL| MONTROLL  
AntiPlurality and Coombs| ?| MONTROLL  
IRV| KISS| KISS  
Plain Plurality| WRIGHT| WRIGHT  
  
Notes: There really is no sensible way to run Borda, Coombs, or AntiPlurality elections if there are write-in candidates. 

We do not know who **Range & Approval voting** would have elected because we only have rank-order ballot data - depending on how the voters chose their "approval thresholds" or numerical range-vote scores, they could have made _any_ of the Big Three win (also Smith). However it seems [likely](AppCW.html) they would have elected Montroll. Here's an **analysis** supporting that view: Suppose we assume that voters who ranked exactly _one_ candidate among the big three would have approved him alone; voters who ranked exactly _two_ would have approved both, and voters who ranked all _three_ would have approved the top-two a fraction **X** of the time (otherwise approve top-one alone).  The point of this analysis, suggested by Stephen Unger, is that voters were allowed to vote "A>B," which while _mathematically_ equivalent to "A>B>C" among the three candidates A,B,C, was _psychologically_ different; by "ranking" a candidate versus "leaving him unranked" those voters in some sense were _providing_ an "approval threshhold."  Then the total approval counts would be 

Montroll=4261+1849X, Kiss=3774+1035X, and Wright=3694+741X. 

Note that Montroll is the most-approved (and Wright the least-approved) _regardless_ of the value of X for _all_ X with 0≤X≤1\. 

Hence: pretty much every voting method mankind ever invented would elect MONTROLL - making this a pretty easy election to call - _except_ that IRV elects KISS and plurality elects WRIGHT. This election thus _singles out IRV & plurality as nearly-uniquely bad performers._

**Another** way of looking at it is: among the Big Three, _all_ these voting methods, [including](IrvLogicBogus.html) IRV, unanimously agree that Wright is the _worst_ choice, i.e, they all would elect Wright using _reversed_ ballots. (The exceptions: AntiPlurality would select Montroll and Coombs would select Kiss as "worst.") If we agree Wright is clearly worst, then it comes down to Kiss vs Montroll. And the voters prefer MONTROLL over Kiss by 4067 to 3477. 

## How will the IRV-propagandists respond? 

Our observation is that IRV-propagandists generally follow this 4-step procedure. 

  1. Contend IRV is the most amazing, best-possible voting method in all sorts of (unfortunately demonstrably [false](Irvtalk.html)) ways. This tends to impress those who think about it for ≤3 minutes or know little about voting theory. 
  2. When confronted with counterexamples to their claims, sneer those were mere "semantics" of interest only to "mathematicians." (Unfortunately, as we've just seen, these counterexamples have very real democracy-denying consequences.) 
  3. When that doesn't work (because now they're talking to somebody who actually knows something), contend such counterexamples, while _admittedly_ making IRV look bad, only arise incredibly rarely. (E.g. FairVote "senior analyst" Stephen Hill, quoted in W.Poundstone's [book](PoundstoneRev.html) _Gaming the Vote_ , compared the rate of occurrence of IRV pathologies like non-monotonicity to that of a "major meteorite strike.") Hill must be amazed how not only non-monotonicity, but 5 other pathologies _as well_ , all managed to occur in only the second IRV election Burlington ever tried! What an incredible fluke! This must be like the annihilation of the entire _galaxy_! The amazingness increases to even greater astronomical levels when you realize the number of times such phenomena have already been seen when surveying the [Louisiana governor runoff elections](LAgovs.html) (such as the notorious "[Lizard vs. Wizard](LizVwiz.html)" race), or the [Australia 2007](Aus07.html) IRV races; and in the (also continually touted by these same IRV propagandists as a "great success" - as usual they never mention its pathologies when they do that) [1990 Irish presidential](Ireland1990.html) election, [Frome 2009](Frome2009.html), ... 
  4. When _that_ too has fallen to the ground, they generally claim the pathology actually was no problem, e.g. it was just _great_ that Kiss won this election, and they see no problem with any of the vast number of pathologies here (course, they'd perceived problems back when it was a "rare" artificial election example in step 3, but that was _then_); or contend that better and simpler voting systems such as [range](RangeVoting.html) or [approval](Approval.html) are somehow bad and/or unobtainable for [mysterious reasons](RVcrit.html) that only they possess, but which cannot be divulged or clearly explained; or falsely contend that somehow [Arrow's theorem](ArrowThm.html) means that nothing can avoid these problems, so IRV is doing as well as anything could; or flail around trying to distract attention with some red herring. 



(When with a new audience, they revert back to step 1.) 

(**Update** 27 March 2009) IRV propagandists indeed responded roughly as predicted above: Extensive [discussion](BurlResponses.html) & compressed [summary](BurlResponses.html#alldone). 

(**Update:** March 2010) Burlington by referendum voted to [repeal](http://www.cctv.org/watch-tv/programs/instant-runoff-voting-interviews) IRV. Unfortunately the only choices the referendum provided were (a) IRV or (b) a plurality+runoff scheme; no particularly good voting-system choice (c) was available. A year later still (March 2011), Mayor Kiss attempted to bring back IRV by a "backdoor" method - or his critics interpreted it that way - but this attempt was rejected by Burlington's voters by a 58-42 margin.  There were several _Burlington Free Press_ [articles](BurlRepeal.html) on this repeal by John Briggs. 

Claims made by T.G.Bouricius and FairVote (IRV advocates) 

> My own city of Burlington VT, has used IRV with **great success** since 2006. As a political scientist I am quite familiar with the characteristics of various election methods... - Terrill Bouricius, letter published in _Aspen Times_ (Colorado) 9 June 2009, i.e. 3 months after this election and shortly before the Burlington's IRV repeal.   
  
---  
  
* * *

## The truth 

As shown in this election, IRV does _not_ "solve the spoiler problem," does _not_ "allow voters to vote their true preference without fear of inadvertently electing a candidate they cannot stand," and it does _not_ elect candidates "actually preferred by a majority." These and other (e.g. non-monotonicity) [pathologies](IrvPathologySurvey.html) are [_not_](IrvParadoxProbabilities.html) rare. IRV in this election did _not_ serve as a "bulwark of democracy" - rather the opposite. Our belief is that [range voting](RangeVoting.html), also known as "score voting," (and probably also [approval](Approval.html) voting) would _not_ have exhibited any of these problems and in the present example would have elected Montroll, with Kiss second. (Indeed range voting _never_ exhibits non-monotonicity or [spoilers](Glossary.html#spoiler), and it is [rare](AppCW.html) that it refuses to elect beats-all winners.)  Kiss would probably have done better (relatively speaking) with range than with approval, though - based on general principles. Specifically, we can simplistically regard Kiss as "leftist," Montroll as "centrist," and Wright as "rightist" in this election. IRV tends to [favor](IrvExtreme.html) extremists while approval voting tends to favor centrists; but range voting has little or no built-in favortism for or against either. 

###  Some references 

Anthony Quas: Anomalous Outcomes in Preferential Voting, Stochastics and Dynamics 4,1 (2004) 95-105; 

William H. Riker & Peter C. Ordeshook: An Introduction to Positive Political Theory (Englewood Cliffs, NJ: Prentice-Hall, Inc., 1973); 

Peter Fishburn & Steven Brams: Paradoxes of Preferential Voting: What Can Go Wrong with Sophisticated Voting Systems Designed to Remedy Problems of Simpler Systems, Mathematics Magazine 56,4 (September 1983) 207-214. 

[Return to main page](RangeVoting.html)

[](http://www.statcounter.com/)
