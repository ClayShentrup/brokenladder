##  Voting about two events; and the demise of naive majoritarianism 

Clay Shentrup & Warren D. Smith, Aug 2015

Suppose that somewhere in the universe, there exist two possible events X and Y, and three voters Amy, Bob, and Cal, such that each of the voters has the following (see table) personal valuations for X and Y; and they each will simply value the combined event X&Y as the _sum_ of their X and Y values. 

The four possible combination-outcomes are ∅ (i.e. neither X nor Y happen), just X, just Y, and "X&Y both happen," For simplicity we're assuming each of our voters values X and Y _independently_ ; i.e. the value of X (in the view of each voter) is unaffected by whether Y happens, and vice versa. One also could consider voters for whom X and Y are dependent events, e.g. the value of X to such a voter would depend on whether Y happens. Then our examples would still work provided the voters value X and Y nearly-enough to independently, e.g. the effects of Y on the value of X, and vice versa, are small enough. 

Example election #1: 

Voter | X value | Y value | combination values  
∅,    X,    Y,   X&Y   
---|---|---|---  
Amy | 3 | **-** 6 | 0,      3,      **-** 6,      **-** 3  
Bob | **-** 6 | 3 | 0,      **-** 6,      3,      **-** 3  
Cal | 4 | 5 | 0,      4,      5,     9  
  
What would happen if we handled this election with **simple-majority 2-choice votes?**

In election #1 using simple majority votes: 

  1. X would be _enacted_ by 2:1 majority (Amy & Cal) whether or not Y was. 
  2. Y would be _enacted_ by 2:1 majority (Bob & Cal) whether or not X was. 
  3. "X&Y" would be _defeated_ by 2:1 majority (voters Amy & Bob) versus "neither" (∅)! 



**These three simple majority votes _contradict_ each other.**

This makes us realize that the naive philosophy that "the majority should win" in any simple-majority two-choice vote, is logically _untenable._

Example election #2 (same as election #1, except Cal replaced by Deb): 

Voter | X value | Y value | combination values  
∅,    X,    Y,   X&Y   
---|---|---|---  
Amy | 3 | **-** 6 | 0,      3,      **-** 6,      **-** 3  
Bob | **-** 6 | 3 | 0,      **-** 6,      3,      **-** 3  
Deb | 2 | 1 | 0,      2,      1,     3  
  
The exact same three simple majority votes would happen in election #2 (except replace "Cal" by "Deb"). 

Given that naive majoritarianism is untenable, what should replace it? We believe the best available philosophy is "[utilitarianism](Bentham.html)." I.e, if these two example elections had been decided by summing everybody's honest valuations of all 4 options, then the summed-scores would have been 

Election #1 | ∅=0 | X=1 | Y=2 | X&Y=3  
---|---|---|---|---  
Election #2 | ∅=0 | X=**-** 1 | Y=**-** 2 | X&Y=**-** 3  
  
We devised the two example elections so that their sums-of-honest-scores yield exactly opposite conclusions. But neither election features any self-contradiction, and their respective winners would have been the best (reckoned by summed honest values) for their respective societies. 

The philosophy of utilitarianism would be instantiated by "honest [score voting](RangeVoting.html)." I.e, if these two example elections had been held using  score voting on all 4 options, their summed-score winners with _honest_ scores would indeed have been X&Y and ∅ respectively. 

However, in 2-choice elections score voting degenerates to simple-majority voting if all voters "exaggerate" their scores to the max and min ends of the allowed-score range. So with all-exaggerating voters, the same contradictions would happen if the same three 2-choice elections were held. With a full 4-choice election, score voting with honest votes would enact X&Y in election #1 but neither (∅) in election #2; but with "normalized" scores (i.e. honest scores _except_ each voter scales them to employ the full allowed-score interval), both elections with 4-choice score voting would elect X&Y - which in election #1 would be the best, but in election #2 the worst, possible outcome. With honest-voter plain [plurality](Plurality.html) voting both elections would yield 3-way exact ties between X, Y, and X&Y. With [instant runoff](rangeVirv.html) IRV election #1 would be a 2-way tie between Y and X&Y; with Condorcet systems it would be a a [cycle](CondorcetCycles.html) "∅ > X&Y > Y > X > ∅." 

### What if you don't like voters who have numerical values in mind?

Or you just don't like numerical valuation _at all_? No problemo... Example election #3: 

#Voters | Their preferences  
---|---  
35% | X > ∅ > X&Y > Y  
33% | Y > ∅ > X&Y > X  
32% | X&Y > X > Y > ∅  
  
In this version, the voters have only preference orderings among the 4 possible outcomes. If we handled this election with simple-majority 2-choice votes: 

  1. X would be _enacted_ by 67:33 majority whether or not Y was. 
  2. Y would be _enacted_ by 65:35 majority whether or not X was. 
  3. "X&Y" would be _defeated_ by 68:32 majority versus "neither" (∅)! 



Again, **these three simple majority votes _contradict_ each other.**

Plain plurality, Borda, and IRV all would choose "X" in this situation with honest preference orderings as votes, but Condorcet systems would regard it as a [cycle](CondorcetCycles.html) "∅ > X&Y > X > Y > ∅." Approval voting (if all voters approved top two) would choose ∅. 

### Conclusions

  * Naive majoritarianism is logically untenable. 
  * This is shown by a very simple election example about only two events X and Y. 
  * Utilitarianism is free from logical self-contradictions, but in the real world of dishonest, exaggerating, colluding voters, there is no way to implement it perfectly via a voting system. 
  * The best voting systems are the ones best approximating utilitarianism. A way to measure how close they come, is [Bayesian Regret](BayRegExec.html). 
  * [Score voting](RangeVoting.html) in tests has one of the lowest Bayesian Regrets among commonly-proposed voting systems, with either honest, or dishonest/strategic voters, or any mixture. 

  


[Return to main page](RangeVoting.html)

[](http://www.statcounter.com/)
