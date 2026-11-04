# approval voting doesn’t collapse into plurality: a response to fairvote

_the mathematics of strategic voting, the evidence from real elections, and why “majority rule” is more complicated than it sounds._

in december 2016, fairvote executive director rob richie published [_new lessons from problems with approval voting in practice_](https://fairvote.org/new_lessons_from_problems_with_approval_voting_in_practice/), arguing that approval voting would largely collapse into ordinary plurality voting when used in competitive elections. his reasoning was that voters would be reluctant to approve anyone other than their favorite, because approving a second-choice candidate could cause that candidate to defeat their first choice.

this wasn’t a new argument. richie had made essentially the [same objection in 2007](https://rangevoting.org/RichieRVessay.html) and [again in 2013](https://rangevoting.org/RichieOnApproval.html). it’s part of a longstanding debate between fairvote’s advocates of instant-runoff voting (irv) and proponents of alternative methods such as approval and score voting. mathematician warren d. smith, my colleagues, and i have spent years examining these claims and publishing detailed responses. the [rangevoting.org archive](https://rangevoting.net/RVcrit.html) documents numerous exchanges involving richie and other fairvote-associated advocates, including terrill bouricius and steven hill. smith and i also [coauthored a critique](https://rangevoting.org/CoreSupp.html) of richie’s argument about the importance of first-choice “core support”.

the objection has persisted through multiple rounds of criticism, mathematical counterexamples, and increasingly substantial empirical evidence. that history matters because the argument initially seems quite reasonable. i had essentially the same objection when i first encountered score voting, in which voters assign numerical scores to candidates. approval voting is simply the binary version of score voting, where every candidate receives either a 1 (approve) or a 0 (don’t approve). it seemed obvious to me that strategic voters would give their favorite the maximum score and everyone else zero. why would anyone voluntarily help a candidate they like less defeat someone they like more?

the mistake is subtle but fundamental. that question considers only one possible consequence of approving a second choice, while ignoring the other. approving your second choice might help them defeat your favorite, but it might also help them defeat someone much worse. whether the approval is strategically advantageous depends on which outcome it is more likely to affect.

there’s a remarkably simple way to see this, and we don’t need advanced voting theory to understand it.

### 1\. the ralph nader test

remember the 2000 presidential election? ralph nader was running on the green party ticket against democrat al gore and republican george w. bush. many americans preferred nader to gore but feared that voting for nader would help elect bush. they therefore voted for gore instead.

now imagine one of those voters. you strongly support the green party, and nader is your favorite candidate, but you’ve reluctantly voted for gore because you consider bush substantially worse and believe gore has a much better chance of winning. then, just before you finish voting, an election official approaches and says, “actually, we’ve changed the rules. you can vote for as many candidates as you want”.

what do you do? do you keep your vote for gore and add a vote for nader, or do you erase your vote for gore and vote exclusively for nader?

the answer should be obvious. you’ve just been offered the opportunity to support your favorite without abandoning the compromise candidate you were already supporting. yet richie’s argument implies that voters like you would tend to do the opposite: withdraw support from gore because giving him an approval might cause him to defeat nader. but you had already demonstrated a willingness to accept precisely that outcome when you voted for gore under plurality. the reasoning is backwards.

this isn’t merely an imaginary account of voter psychology. political scientist barry burden examined the 2000 american national election studies data in [_did ralph nader elect george w. bush?_](https://webdoc.sub.gwdg.de/ebook/p/2005/weidenbaum/Burden.pdf). among surveyed voters who rated nader highest on pre-election feeling thermometers and reported voting, approximately **90.6% voted for somebody else**. about 52% voted for gore, 37.6% for bush, and only 9.4% for nader.

the substantial bush share is worth noting. preferring nader didn’t necessarily mean preferring gore to bush, and we shouldn’t assume that everyone who placed nader first would have cast the same approval ballot. nevertheless, the data demonstrate that voters frequently abandoned their most highly rated candidate in favor of someone else. this behavior wasn’t confined to a few unusually sophisticated strategists.

the survey cannot establish precisely how these people would have behaved under approval voting, but for those who preferred nader to gore to bush and supported gore to prevent bush from winning, the incentive is straightforward. if you’re willing to sacrifice your entire vote for your favorite to help a compromise win, why would you refuse to support that compromise when you can simultaneously vote for your favorite?

this is the central omission in fairvote’s argument. richie considers the possibility that approving a compromise will cause that compromise to defeat your favorite, but largely neglects the possibility that withholding approval will cause someone much worse to defeat them both. once both possibilities are considered, the prediction that rational voters should generally approve only their favorites ceases to follow.

### 2\. what happens when we actually simulate strategic voters?

the nader example provides a straightforward reason to question richie’s intuition, but we can also examine the prediction systematically. if strategic voting really causes approval voting to collapse into plurality, then increasing the proportion of strategic voters in a simulated electorate should cause a dramatic rise in ballots approving exactly one candidate.

consider an exploratory simulation consisting of 2,000 elections per experimental setting, with 601 voters in each election and between three and seven candidates. each election takes place in a political issue space with one to three dimensions. some electorates are relatively homogeneous, while others are sharply polarized into two camps of varying sizes. voters differ in their ideological positions, the importance they assign to different issues, and their evaluations of qualities such as candidate competence or charisma. their utilities also include individual variation and differences in how much is at stake for them in the election.

the experiment compares two ways of constructing approval ballots. sincere voters use a simple midpoint rule: they approve every candidate whose utility exceeds the midpoint between their personal favorite and least favorite. strategic voters instead use imperfect polling information to estimate candidate viability, calculate a viability-weighted expected utility threshold, and approve candidates whose utilities exceed that threshold. the polling estimates incorporate noise, so voters have useful but imperfect information about which candidates are competitive.

the nominal proportion of strategic voters varies from zero to 100% in ten-point increments. the two political camps have slightly different tendencies to vote strategically, with one at 1.1 times the nominal rate and the other at 0.9 times, capped at 100%. the same underlying elections, voters, and random draws are reused across all settings, allowing the results to isolate the effects of changing voter strategy.

here are the results:
    
    
    strategy   bullet    multiple    avg.  
    --------------------------------------  
       0%      19.1%      80.9%      2.58  
      10%      19.6%      80.4%      2.54  
      20%      20.2%      79.8%      2.50  
      30%      20.8%      79.2%      2.46  
      40%      21.4%      78.6%      2.42  
      50%      22.0%      78.0%      2.37  
      60%      22.6%      77.4%      2.33  
      70%      23.2%      76.8%      2.29  
      80%      23.8%      76.2%      2.25  
      90%      24.4%      75.6%      2.21  
     100%      24.7%      75.3%      2.19

 _strategy = nominal strategic-voting rate; bullet = exactly one approval; multiple = two or more approvals; avg. = mean approvals per ballot._

even when the nominal strategic-voting rate rises from zero to 100%, bullet voting increases by only 5.6 percentage points, from 19.1% to 24.7%. approximately three-quarters of voters still approve multiple candidates. strategy makes voters somewhat more selective; it doesn’t make them behave like plurality voters.

### what actually changes under strategy

the distribution of approvals is especially informative. with entirely sincere voting, 19.1% of voters approve one candidate, 33.9% approve two, 25.2% approve three, and 21.7% approve four or more. at the highest strategic setting, those figures become 24.7%, 41.8%, 25.0%, and 8.6%, respectively.

most of the change comes from voters approving fewer of their less-preferred candidates, particularly among those who would otherwise approve four or more. the proportion approving exactly three candidates barely changes, while the proportion approving two actually increases. the average number of approvals falls from 2.58 to 2.19, but there is nothing resembling a wholesale abandonment of multiple approvals.

the result makes theoretical sense. strategic voters should become more selective as they consider which candidates can realistically affect the election, but the strategically correct threshold can still include several candidates. a voter may rationally approve two or three candidates, particularly when their favorite is unlikely to win and they have strong preferences among the plausible alternatives.

there are important limitations. the sincere midpoint threshold is a modeling convention, not a universal definition of sincerity. the strategic threshold is a poll-informed heuristic rather than an exact game-theoretic equilibrium. the polling estimates are held fixed across the experiment rather than allowing voter expectations to evolve as strategies change. and because the two political camps have different strategic-voting rates, the nominal 100% setting actually represents approximately 93.5–96.5% strategic voters, depending on their relative sizes.

the simulation therefore doesn’t establish that actual elections will exhibit precisely these percentages. what it demonstrates is that, under a reasonably varied model of voters, candidates, ideology, and polling uncertainty, strategic approval thresholds do not generally converge on approving only one’s favorite.

the argument that helping your second choice can hurt your favorite is mathematically true. it simply isn’t a complete model of rational voting behavior.

### 3\. instant-runoff voting has the opposite strategic problem

now consider what happened in the august 2022 special election for alaska’s sole seat in the u.s. house of representatives. the election used instant-runoff voting, the system richie advocates, and featured three major candidates: democrat mary peltola and republicans sarah palin and nick begich.

under irv, voters rank candidates in order of preference. if nobody receives a majority of first-choice votes, the candidate with the fewest is eliminated and their ballots are transferred to the next-ranked continuing candidate. the process repeats until one candidate has a majority of the votes still in contention.

after the initial write-in elimination, peltola received approximately 40.2% of the continuing first-choice votes, palin 31.3%, and begich 28.5%. begich was therefore eliminated. his ballots transferred to palin or peltola, unless they had no further usable ranking, and peltola ultimately defeated palin.

the election was administered according to its rules, but the published cast vote records revealed a striking result. **begich would have defeated both opponents in separate head-to-head elections.** among ballots expressing the relevant comparisons, he was preferred to peltola by approximately 52.5% to 47.5% and to palin by approximately 61.4% to 38.6%.

these results are documented in [adam graham-squire and david mccune’s mathematical analysis](https://arxiv.org/abs/2209.04764) and the [published cast vote record analysis](https://ranked.vote/report/us/ak/2022/08/cd). begich was the _condorcet winner_ , meaning he was preferred head-to-head to every opponent, yet he was eliminated because he had the fewest first-choice votes. this is the _center-squeeze problem_ : a broadly acceptable candidate can be squeezed out by rivals with stronger but narrower first-choice coalitions.

the strategic implications are especially interesting. many palin supporters ranked begich second and peltola last. their sincere ranking was therefore palin > begich > peltola. but by supporting palin first, they helped keep her ahead of begich, causing begich’s elimination and ultimately electing their least-preferred candidate.

### the incentive to betray your favorite

the official tally gives palin 58,973 votes and begich 53,810 at the decisive elimination round, a difference of just 5,163. if 2,582 palin-first voters who preferred begich to peltola had instead ranked begich first, that would have reversed the ordering of palin and begich. palin would have been eliminated, and, with all other preferences unchanged, begich would have defeated peltola in the final round.

those voters could therefore have improved the outcome from their own perspective by ranking their second choice above their favorite. this is called the _compromise strategy_ , or _favorite betrayal_. it’s closely analogous to the behavior of nader supporters in 2000: voters sacrifice support for their preferred candidate to improve the chances of a more viable compromise against someone they dislike more.

there was also a spoiler effect. if palin had been absent from the election, the recorded pairwise preferences indicate that begich would have defeated peltola. with palin present, begich was eliminated and peltola won. the presence of an additional candidate changed the result despite that candidate losing.

none of this means that palin supporters actually recognized and attempted such a strategy, or that peltola’s election was illegitimate. the counterfactual holds the other recorded preferences fixed and changes only the specified ballots. but it demonstrates that the strategic incentive existed in an actual governmental election, and that irv’s guarantee that lower rankings cannot hurt a higher-ranked candidate doesn’t eliminate incentives to reverse one’s sincere ranking.

### the same phenomenon in burlington

alaska wasn’t the first documented governmental irv election to eliminate a condorcet winner. in burlington, vermont, in 2009, progressive incumbent bob kiss won the mayoral election after democrat andy montroll was eliminated. yet the cast ballots showed that montroll would have defeated both kiss and republican kurt wright head-to-head, by approximately 54% to 46% and 56% to 44%, respectively.

[warren smith’s analysis of the burlington election](https://rangevoting.org/Burlington.html) documents the pairwise counts. as in alaska, a candidate with broad majority support was eliminated before that support could influence the final comparison. wright’s presence also changed the outcome: without him, montroll would have defeated kiss. the problem therefore didn’t depend on a peculiar hypothetical distribution of rankings. it occurred in two real elections with different electorates, candidates, and political circumstances.

these examples demonstrate that center squeeze and spoiler effects can occur under irv, but don’t establish their frequency. nor does being the condorcet winner prove that begich or montroll maximized aggregate voter satisfaction, since ordinal rankings don’t reveal how strongly each voter preferred one candidate over another.

indeed, [jeanne clelland’s analysis](https://arxiv.org/abs/2303.00108) found that peltola would probably still have won under approval voting, given her modeled assumptions about how alaska voters would translate their rankings into approval ballots, while begich would almost certainly have won under star voting. that’s relevant evidence against treating approval as a guaranteed solution to every condorcet failure.

nevertheless, alaska and burlington directly challenge fairvote’s presentation of irv as a method that resolves the lesser-evil voting problem. there are actual irv elections in which voters could have improved the outcome by ranking a compromise ahead of their sincere favorite.

### 4\. why approval and score voting have a different strategic property

return to the alaska voter who preferred palin to begich to peltola. under irv, strategically moving begich above palin could have helped begich survive elimination. under approval voting, the voter could instead approve both palin and begich. giving begich an approval wouldn’t require withdrawing approval from palin.

this distinction is mathematically important. under approval voting, if you approve someone you prefer less than another candidate, you cannot improve the more-preferred candidate’s chances by withholding their approval. adding an approval for your favorite improves or preserves their position relative to every competitor, including the compromise candidate. removing that approval cannot improve your favorite’s position.

ordinary score voting has the same property. suppose you sincerely assign palin 100 points, begich 80, and peltola zero. strategic considerations might lead you to give begich 100 as well, exaggerating how highly you regard him. but there is no strategic benefit to reducing palin’s score below begich’s. you can raise a compromise to the same level as your favorite without lowering your favorite.

this is called _favorite-betrayal resistance_. approval and ordinary score voting satisfy it; irv does not.

irv satisfies a different property called _later-no-harm_ : ranking additional candidates below your favorite cannot cause your favorite to lose. approval voting lacks that guarantee because approving a second choice can indeed help that candidate defeat your first choice. the trade-off is real, but it is misleading to emphasize irv’s protection of first choices while ignoring the possibility that voters can benefit from ranking a compromise above their favorite in the first place.

irv also exhibits another strategic phenomenon called _pushover_. because the sequence of eliminations determines where votes transfer, supporters of one candidate can sometimes improve their favorite’s chances by temporarily strengthening an inferior opponent. this is related to irv’s failure of monotonicity, under which increasing support for a candidate can sometimes cause that candidate to lose.

alaska exhibited a documented monotonicity paradox. graham-squire and mccune showed that if 6,000 voters who had supported only palin had instead placed peltola first, peltola would have lost rather than won. the change would have caused palin to be eliminated before begich, allowing begich to defeat peltola. the same election also exhibited a _no-show paradox_ : under a different counterfactual, 6,000 palin-first voters could have obtained a more-preferred outcome by abstaining instead of voting.

these are mathematical counterfactuals, not evidence that voters attempted elaborate manipulation. exploiting them can require unusually accurate information and coordination. nevertheless, they demonstrate why we should assess voting systems by the actual incentives their rules create rather than labeling one method strategically safe and another strategically defective.

### 5\. the mathematics of optimal approval voting

we can now state the underlying approval-voting calculation more precisely. suppose a voter assigns utilities of 100 to alice, 80 to bob, and zero to carol. alice is their favorite, bob is reasonably good, and carol is terrible. should the voter approve bob in addition to alice?

if alice has essentially no chance of winning and the contest is between bob and carol, approving bob offers a potentially large benefit. it can prevent a zero-utility outcome at almost no cost to alice. if alice and bob are the only plausible winners, however, approving bob could be disadvantageous because it might cause a moderately worse outcome without providing meaningful protection against carol.

the correct strategy therefore depends on both utility differences and the probabilities that one additional approval will change the winner. we can summarize the decision as follows:

**approve a candidate when the probability-weighted benefit of helping them defeat worse alternatives exceeds the probability-weighted cost of helping them defeat better alternatives.**

under a simplified probabilistic model, this gives a useful threshold heuristic: approve every candidate whose utility exceeds the expected utility of the election winner. if the expected winning utility is 60, for example, the voter approves alice and bob but not carol. if it is 90, the voter approves only alice.

[warren smith’s discussion of approval strategy](https://rangevoting.net/RVstrat6) develops this reasoning in more detail. technically, the exact calculation involves the probabilities that a ballot will be pivotal between particular pairs of candidates, rather than merely their overall chances of winning. the simplified expected-winner threshold is therefore not a universal theorem about all strategic elections.

but the central point remains: **bullet voting is sometimes strategically optimal, and approving multiple candidates is sometimes strategically optimal.** no general principle says that maximizing your influence requires approving only your favorite.

this also helps explain why the number of approvals cast in an election is a poor measure of whether voters are behaving intelligently. a voter who strongly prefers one candidate and considers every alternative unacceptable may rationally approve only one. a voter who considers several candidates acceptable relative to the likely winner may rationally approve several. observing the ballot alone cannot tell us whether either voter has misrepresented their preferences.

### 6\. ballot expressiveness is not the same as effective voter influence

one of fairvote’s recurring arguments is that ranked ballots are more expressive than approval ballots. after all, a ranked ballot allows voters to order candidates from favorite to least favorite, while an approval ballot simply distinguishes approved candidates from disapproved ones.

that’s true in a narrow technical sense, but it confuses the means with the end. **the objective isn’t to maximize how much information voters can write on their ballots. it’s to produce election outcomes that correspond as closely as possible to their preferences.** ballot expressiveness is useful only insofar as it helps accomplish that objective.

consider a voter who prefers nader to gore to bush. under plurality voting, supporting nader means withholding support from gore, even if the voter considers preventing bush’s victory much more important than the difference between nader and gore. a ranked ballot can express the voter’s complete ordering, but under irv, a vote for gore won’t count while nader remains in contention. under approval voting, the voter can support both nader and gore simultaneously. the ballot records less information about the voter’s precise ordering, but allows them to influence the result in a way that may better reflect their actual interests.

alaska’s 2022 election provides a real-world illustration. many voters ranked nick begich second, and the complete ballot records reveal that he was preferred head-to-head to both opponents. yet irv eliminated him before those secondary preferences could help him. the system collected the information, but its elimination procedure prevented much of that information from affecting the outcome.

there’s also a more elementary problem with comparing the number of candidates marked under the two systems. under ranked-choice voting, it can be perfectly reasonable to rank every candidate, including those you strongly dislike. under approval voting, you ordinarily wouldn’t approve everyone, because the purpose is to distinguish candidates worth supporting from those who aren’t.

imagine requiring approval voters to explicitly mark every candidate either “approve” or “disapprove”, rather than simply checking the approved candidates and leaving the others blank. someone who approved two candidates and disapproved four would now have marked all six, just like someone who ranked all six under irv. the underlying preferences and election calculation would be unchanged. we’d merely have made the ballot more cumbersome, sacrificing the elegant simplicity of the familiar check-the-box format.

so counting marked names doesn’t tell us which system gives voters more effective influence. an approval ballot can look less expressive while being functionally more expressive in the sense that matters for a particular election: enabling voters to translate their preferences into consequential support for the candidates they prefer.

there is a genuine informational advantage to ranked ballots. they can distinguish between two candidates who would receive equal approval, and that information can be useful to counting methods that actually employ it. conversely, approval ballots don’t record the voter’s relative preference between two approved candidates or between two disapproved candidates. these are real differences in what the ballots communicate.

but a richer description of preferences doesn’t automatically translate into an outcome that better reflects them. **the meaningful question isn’t how expressive the ballot feels, but how effectively the voting system translates voters’ preferences into outcomes they actually want.**

this distinction is discussed in the center for election science’s article [_expressiveness in approval vs. ranked ballots_](https://www.electionscience.org/library/expressiveness-in-approval-vs-ranked-ballots/). the larger point is that ballot expressiveness is an implementation detail, not an end in itself. a voting system should ultimately be evaluated by the quality of its results.

### 7\. what real approval voting elections tell us

when richie published his article in 2016, approval voting had not yet been used in modern american governmental elections. he therefore relied heavily on internal elections, student elections, and two presidential preference polls. those examples provide information about behavior in their particular settings, but they cannot establish what voters would invariably do in governmental elections.

in one 2016 Independent Party of Oregon presidential preference poll, voters cast approximately 1.38 approvals per ballot. in another poll conducted by the Independent Voter Network, the average was approximately 1.25. richie interpreted the relatively low number of multiple approvals as evidence that strategic voters were reluctant to support compromise candidates.

but even if every voter in those polls had been behaving strategically, the conclusion wouldn’t follow. approving only one candidate can be strategically rational depending on the voter’s preferences and perceptions of candidate viability. the aggregate count of approvals doesn’t reveal whether voters have chosen their thresholds wisely, much less whether a different voting method would have produced a more satisfying outcome.

since then, approval voting has been used in governmental elections, giving us more directly relevant evidence.

### fargo

fargo adopted approval voting in 2018 and began using it in 2020. its first approval election filled two city commission seats. a later [review by institute h21](https://www.ih21.org/aktuality/approval-voting-in-fargo) corrected a widely circulated ballot-count figure: the election had approximately 23,819 ballots rather than the preliminary 18,805 figure often reported. using the corrected count gives approximately 1.80 approvals per ballot rather than the commonly cited 2.28. because this was a two-seat election, it also isn’t directly comparable with a single-winner contest.

a cleaner example is fargo’s june 2022 mayoral election, in which 15,090 ballots produced 23,923 approvals, or approximately 1.59 approvals per ballot. incumbent tim mahoney received approval on approximately 65% of ballots, finishing well ahead of the other candidates. the [election report](https://approval.vote/report/us/nd/fargo/2022/06/mayor) provides the candidate-level results.

this single-winner governmental election didn’t remotely exhibit universal bullet voting. the average ballot contained approximately 59% more approvals than would have been possible under a one-choice plurality ballot. that doesn’t tell us which voters were sincere or strategic, but it clearly shows that many voters made use of the option to support additional candidates.

### st. louis

st. louis uses approval voting to select two finalists in an open, nonpartisan primary, followed by a general election between them. this differs from single-round approval voting because voters are choosing which candidates advance rather than directly electing an officeholder.

the march 2025 mayoral primary is particularly informative because its cast vote records allow us to examine individual ballot patterns. there were 34,945 ballots and 48,908 approvals, averaging approximately 1.40 approvals per ballot. about 32.8% of voters approved more than one candidate.

that aggregate statistic is only the beginning of the story. among voters approving the two leading candidates, cara spencer and tishaura jones, approximately 38.8% and 41.9%, respectively, approved additional candidates. among voters approving the less competitive candidates, mike butler and andrew jones, those proportions rose to **84.4% and 83.1%**.

[felix sargent’s analysis of the st. louis cast vote records](https://felixsargent.com/democracy/2025/08/29/st-louis-approval-voting) documents these figures. the pattern is consistent with voters wanting to support less viable candidates while also influencing the contest among more competitive alternatives. we cannot prove that all those ballots were sincere or strategically optimal, but they demonstrate that supporters of less competitive candidates frequently used multiple approvals in an actual governmental election.

there is another revealing detail. spencer received approval on approximately 68.2% of ballots, and 38.8% of her supporters approved additional candidates. that means roughly 61.2% of her supporters approved spencer alone, or approximately **41.7% of all voters**.

an approval ballot doesn’t explicitly identify a first choice, so we cannot prove that every one of those voters sincerely preferred spencer to every alternative. but exclusive approval is a useful observable measure of concentrated support, especially given that approval voting never rewards withdrawing support from a sincere favorite while approving a less-preferred candidate.

this becomes especially relevant when we consider another of richie’s objections: the possibility that approval voting could elect someone who isn’t anybody’s favorite. the st. louis records don’t establish a universal lower bound on first-choice support, but they do demonstrate a striking contrast with that hypothetical. one of the leading candidates had a very large bloc of voters who supported her exclusively, in addition to substantial support from voters who approved multiple candidates. spencer subsequently won the two-candidate general election.

### 8\. how little first-choice support can an irv winner have?

the first-choice objection is particularly interesting when applied consistently to instant-runoff voting.

under conventional irv with six candidates and no exhausted ballots, a winner’s initial first-choice support can be arbitrarily close to just **3.125%**. in other words, it’s mathematically possible for a candidate who begins with approximately one thirty-second of the first-choice votes to survive successive eliminations and ultimately win.

someone might reasonably object that such an extreme outcome is extraordinarily unlikely in practice. i agree. but the same objection applies to the hypothetical approval winner who is nobody’s favorite. both examples demonstrate what’s mathematically possible, not what we should normally expect.

in actual governmental approval elections, the winners have received substantial direct support, including sizable numbers of voters who approved them exclusively. in st. louis, for example, we observed that approximately 41.7% of voters approved spencer and nobody else. that doesn’t prove she was the sincere first choice of all those voters, but it’s certainly a more informative observation than pointing to a contrived election in which an approval winner has no first-choice supporters whatsoever.

and the formal distinction between zero and 3.125% first-choice support isn’t obviously relevant to election quality. why should we consider a winner with 3.125% first-choice support inherently legitimate, but a candidate preferred as an excellent compromise by virtually everyone illegitimate?

the relevant question is how effectively the system identifies an outcome that satisfies the electorate. the number of first-choice votes is one potentially useful indicator, but there are others. and, as the alaska and burlington elections demonstrate, first-choice support can sometimes be a poor guide to a candidate’s broader appeal.

### 9\. condorcet efficiency: another useful test

one way to evaluate election outcomes is _condorcet efficiency_ : how often a voting system elects a candidate who would defeat every opponent in a head-to-head comparison, when such a candidate exists.

this is especially relevant to the alaska and burlington elections, where irv eliminated precisely such a candidate. it also helps illustrate why a voting method’s mathematical guarantees don’t necessarily translate into real-world performance under strategic voting.

condorcet methods are specifically designed to elect the condorcet winner when one exists according to the submitted rankings. but voters can strategically distort those rankings. consequently, a condorcet-consistent method isn’t guaranteed to elect the candidate who would have been the condorcet winner according to voters’ sincere preferences.

warren smith demonstrated this distinction in [_range voting with mixtures of honest and strategic voters_](https://rangevoting.org/StratHonMix.html). in one experiment involving 29,999 simulated elections, 13 voters per election, six candidates, and a 50/50 mixture of sincere and strategic voters, approval voting agreed with the sincere-preference condorcet winner in 10,997 elections. several traditional condorcet methods did so in 10,342 elections, while irv did so in 8,387.

those figures are counts across all the simulated elections, not percentages conditional on a condorcet winner existing. the results also depend on smith’s particular models of voter preferences and strategy. nevertheless, the finding is instructive: under those assumptions, a voting system that doesn’t guarantee a condorcet winner from the submitted ballots was more likely to elect the sincere-preference condorcet winner than some methods specifically designed around that criterion.

more recently, a [2024 study published in _games and economic behavior_](https://doi.org/10.1016/j.geb.2024.04.007) by françois durand, antonin macé, and matías núñez examined how voters coordinate under approval, plurality, and anti-plurality voting in three-candidate elections. under one of the study’s modeled coordination processes, approval voting elected the condorcet winner in 99.96% of cases where one existed. the result was robust under several alternative assumptions about voter behavior and preference intensities.

that study didn’t directly compare approval with irv, and neither study establishes a universal condorcet-efficiency figure for actual elections. but both demonstrate why the relevant question isn’t merely whether a voting method guarantees a particular result from perfectly sincere ballots. it’s how the method performs once we account for how voters actually respond to its incentives.

condorcet efficiency is therefore an interesting measure of election quality, though it still doesn’t tell the whole story. a candidate who defeats every opponent head-to-head may not necessarily be the candidate who maximizes voters’ overall satisfaction, since pairwise preferences don’t capture the intensity of those preferences.

for a broader picture, we can examine that satisfaction directly.

### 10\. voter satisfaction efficiency: which systems produce better outcomes?

so far, we’ve examined strategic incentives, ballot behavior, and some notable election failures. but there’s a more systematic way to compare voting methods: measure how satisfied voters are with the candidates they actually elect.

this is the idea behind _voter satisfaction efficiency_ , or vse. computer simulations generate electorates in which voters have different preferences and different levels of satisfaction with each possible winner. the voters then cast ballots under different voting systems, using specified models of sincere or strategic behavior. by repeating this process across thousands or millions of elections, we can measure how successfully each method tends to select candidates who maximize voters’ overall satisfaction.

the results are normalized so that a method that always elects the candidate who maximizes total voter satisfaction scores 100%, while random candidate selection scores 0%. importantly, **the simulations can account for voter strategy, including strategic exaggeration, bullet voting, polling uncertainty, and other behaviors that affect election outcomes**. rather than merely asking whether a voting system has some undesirable theoretical property, we can examine how much that property actually affects the quality of its winners.

early simulations by warren smith found that approval and score voting generally performed substantially better than plurality and instant-runoff voting under a variety of assumptions. his [published results](https://rangevoting.org/UniqBest.html) helped establish this approach to comparing voting methods.

more recently, marcus ogren’s extensive study, [_voter satisfaction efficiency: many, many results_](https://voting-in-the-abstract.medium.com/voter-satisfaction-efficiency-many-many-results-ad66ffa87c9e), examined a wide range of voter distributions, candidate qualities, strategic behaviors, and polling conditions. the results are more nuanced than a blanket endorsement of approval voting. star voting, ranked-robin voting, and approval top-two frequently achieve higher vse than single-round approval voting. and under certain conditions, irv can outperform approval, particularly when sufficiently many approval voters insist on bullet voting even when approving additional candidates would be strategically advantageous.

nevertheless, approval voting performs competitively across many of the tested conditions, frequently outperforming irv. some models expose serious weaknesses in irv, particularly when broadly acceptable candidates have relatively little first-choice support. the magnitude of these differences depends on the assumed distribution of voter preferences and behavior, which is why examining a wide range of models is important.

none of this means vse is the only consideration in choosing a voting system. administrative simplicity, transparency, voter comprehension, and the likelihood of adoption also matter. nor can simulations perfectly predict how people will behave in actual elections. but they provide something far more informative than counting how many candidates voters mark on their ballots: a quantitative comparison of how effectively different election rules translate voter preferences and strategies into outcomes that satisfy the electorate.

this is the empirical question missing from fairvote’s analysis. even if some voters bullet vote under approval, and even if approving a compromise occasionally causes a favorite to lose, what matters is how those behaviors affect election outcomes compared with the alternatives. vse allows us to investigate precisely that question.

### 11\. what fairvote gets right

approval voting isn’t a perfect system. its performance depends partly on how voters choose their approval thresholds, and strategic coordination by organized factions can affect outcomes. binary ballots also discard some information about preference intensity: a candidate considered excellent receives the same approval as one considered barely acceptable if both are above the voter’s threshold. score voting preserves more of that information, at least when voters use the scoring scale meaningfully.

approval voting doesn’t guarantee election of a condorcet winner or a candidate who receives an absolute majority of first-choice support. under some assumptions, more sophisticated methods such as star or approval top-two can achieve higher vse. and the fact that approval voting avoids favorite betrayal doesn’t mean it avoids every strategic dilemma.

these are legitimate trade-offs. however, none establishes that approval voting collapses into plurality, nor can they be fairly evaluated by comparing approval voting’s worst-case behavior with an idealized account of irv.

the proper comparison examines how voters are likely to behave under each system, how often different strategic incentives arise, whether voters can realistically exploit them, and how effectively the resulting outcomes satisfy the electorate. by that standard, fairvote’s recurring bullet-voting argument is incomplete.

### 12\. the practical question: what reform should we pursue?

there is one final consideration. electoral reform isn’t simply a mathematical problem. voting methods must be adopted, understood, administered, and maintained. a more sophisticated system that performs slightly better under certain assumptions but has a substantially lower chance of adoption may accomplish less than a simpler method with a large expected benefit.

a useful framework is:

**expected reform impact = probability of adoption × expected benefit if adopted.**

approval voting has a significant practical advantage because it requires removing the restriction that voters may support only one candidate. ballots can instruct voters to select every candidate they wish to support, and tabulation simply adds the approvals for each candidate. there are no elimination rounds or transfers, and local totals can be aggregated directly.

this simplicity doesn’t guarantee political success, nor does it eliminate voter confusion or the costs of changing election procedures. but it is a material advantage when comparing practical reforms, particularly when the alternative is retaining plurality voting indefinitely.

i’ve explored this argument further in [_the only voting reform worth funding_](https://clayshentrup.medium.com/the-only-voting-reform-worth-funding-5776beefdd2b).

### conclusion: the strategic incentives are not what fairvote claims

for nearly two decades, fairvote advocates have repeated essentially the same objection to approval voting: supporting a second-choice candidate can cause that candidate to defeat your favorite, so strategic voters will tend to approve only their favorite. the first proposition is correct. the second doesn’t follow, because it ignores the possibility that withholding approval from a compromise will allow a much worse candidate to win.

the 2000 presidential election makes the missing consideration intuitive. many nader-preferring voters were willing to abandon their favorite entirely to support someone more viable. approval voting would have allowed them to express both preferences without sacrificing support for nader. the strategic-voting simulation examines the same principle more systematically: as voters become overwhelmingly strategic, bullet voting increases by only 5.6 percentage points, and approximately three-quarters of ballots still approve multiple candidates. strategic behavior changes the threshold for granting approval, but doesn’t inherently imply approving only one candidate.

meanwhile, the irv elections in alaska in 2022 and burlington in 2009 demonstrate that ranked-choice voting has a different version of the lesser-evil problem. both elections eliminated candidates preferred head-to-head to every rival, and voters supporting other candidates had opportunities to improve the outcome by strategically ranking a compromise ahead of their favorite. approval and ordinary score voting avoid that specific incentive because increasing support for a compromise never requires withdrawing support from a more-preferred candidate.

the theoretical objections based on first-choice support and the number of candidates marked on a ballot are equally inadequate when detached from an analysis of electoral outcomes. approval ballots distinguish approved from disapproved candidates, whereas ranked ballots order candidates relative to one another. those are different kinds of information, and counting marked names doesn’t tell us how successfully either method uses that information. similarly, pointing out that approval could theoretically elect a candidate who is nobody’s favorite is not especially illuminating when irv could theoretically elect a candidate beginning with only 3.125% first-choice support in a six-candidate election. neither extreme possibility tells us what happens in ordinary elections.

none of this proves that approval voting is universally optimal. its limitations are real, and other methods can achieve higher voter satisfaction efficiency under particular conditions. but the evidence doesn’t justify treating approval voting as a failed experiment, nor does it support the prediction that competitive elections will inevitably reduce it to plurality voting.

the important strategic distinction remains straightforward: **under plurality voting, supporting a compromise requires abandoning your favorite. under approval voting, it doesn’t. under instant-runoff voting, there are still circumstances in which abandoning your favorite can improve the outcome.**

after years of published exchanges, this debate deserves more than the repetition of an intuitive objection. voting methods should be compared according to the incentives they create, how voters actually behave, their condorcet efficiency and voter satisfaction efficiency under plausible models, and their practical feasibility. the available mathematics and empirical evidence allow a considerably more informative comparison than fairvote’s recurring prediction of universal bullet voting.

### further reading

  * [rob richie, _new lessons from problems with approval voting in practice_ (2016)](https://fairvote.org/new_lessons_from_problems_with_approval_voting_in_practice/)
  * [rob richie, _why irv? comparison with alternative systems_ (2007)](https://rangevoting.org/RichieRVessay.html)
  * [warren smith, response to richie’s approval-voting argument](https://rangevoting.org/RichieOnApproval.html)
  * [clay shentrup and warren smith, critique of richie’s core support criterion](https://rangevoting.org/CoreSupp.html)
  * [barry burden, _did ralph nader elect george w. bush?_](https://webdoc.sub.gwdg.de/ebook/p/2005/weidenbaum/Burden.pdf)
  * [graham-squire and mccune, _a mathematical analysis of the 2022 alaska special election_](https://arxiv.org/abs/2209.04764)
  * [jeanne clelland, _ranked choice voting and condorcet failure in alaska_](https://arxiv.org/abs/2303.00108)
  * [warren smith, _burlington vermont 2009 irv mayoral election_](https://rangevoting.org/Burlington.html)
  * [warren smith, _the bullet voting bugaboo_](https://rangevoting.net/BulletBugaboo)
  * [warren smith, _range voting threshold strategy made easy_](https://rangevoting.net/RVstrat6)
  * [warren smith, _range voting with mixtures of honest and strategic voters_](https://rangevoting.org/StratHonMix.html)
  * [durand, macé, and núñez, _voter coordination in elections: a case for approval voting_ (2024)](https://doi.org/10.1016/j.geb.2024.04.007)
  * [marcus ogren, _voter satisfaction efficiency: many, many results_](https://voting-in-the-abstract.medium.com/voter-satisfaction-efficiency-many-many-results-ad66ffa87c9e)
  * [felix sargent, _st. louis approval voting: what the cast vote records reveal_](https://felixsargent.com/democracy/2025/08/29/st-louis-approval-voting)
  * [institute h21, _approval voting in fargo: correcting the record_](https://www.ih21.org/aktuality/approval-voting-in-fargo)


