##  When are Honest Range Voters victimized by Strategic ones? 

It has been suggested to us (we [do not agree](rangeVapp.html), but the case can be made) that [approval voting](Approval.html) is a superior voting system to [range voting](Approval.html).  Well first of all, Approval is simpler. However, we are here focusing not on simplicity but on _inherent_ voting system _quality_.  Why? Because honest range voters can be "victimized" by strategic ones who "exaggerate" their opinions to get more power, ranking candidates artificially 0 or 99 rather than honest scores like 23. In contrast, with approval, to a rough approximation (but [only](RVstrat2.html) approximately since honest and strategic approval voting are _not_ exactly the same thing), all voters are "forced" to be strategic, approximately getting rid of this inequality. So that is why approval is supposed to be better. 

There are many responses to that criticism of range voting. We won't discuss them fully here. We'll only focus on a few. The **"moral" response** is the honest range voters were not "victimized" because they _voluntarily chose_ not to exaggerate in order to help society, or because they did not consider it worth it, or for whatever reason. (The exaggeration strategy is so obvious that few if any voters would be too stupid to conceive of it, so it was a full-knowledge, voluntary choice.) Or (another flavor) those voters shouldn't complain because evidently their feelings that candidate A was better than B were not very intense if they voted A=51, B=50, so they didn't exactly suffer catastrophically from B's victory. 

But some critics are unhappy with that response. E.g. maybe it isn't as "obvious" as I think. 

The **"happier society" response** is that this "victimization" does not matter, because, _society-wide_ , everybody, on average, ends up happier with range voting, even though the strategic-voter group can end up relatively happier than the honest-voting group. That's because the good effect on decision quality that range voting gets from having better-quality information, is enough to outweigh any bad effects of this sort. We will demonstrate that is true, by computer simulation below. 

But some attackers feel that response is inadequate. They vaguely feel that society being happier is not good enough. They also want "fairness." They feel a system which allows the tactically stupid, or more honest and less strategic voters, to suffer a relative disadvantage, is bad. Of course, such voters suffer such a relative disadvantage in essentially [every](GibbSat.html) voting system, but our critics are vaguely unsatisfied with that response too, feeling that somehow range voting is worse in this respect than some other systems. 

That leads us to the **"not really victimized"** response. Again we fire up our computer election simulators. This time, we evaluate the social utility of the election results we get from range and approval voting _not_ for all society, but instead _only_ for the honest-voter subset of society. The point is to see whether and when the honest voters really are victimized by the combination of range-voting rules plus nasty exaggerator voters. They are victimized if their average utility is made worse by range voting rules than it would have been under approval voting rules. 

Our computer sims find that it depends how many strategic voters there are and how many honest ones there are. (Our simulation simplistically assumes that all the voters are either 100% honest or 100% maximally-exaggerating.) "Victimization" in this relative sense indeed does occur, but only if the fraction of strategic voters is sufficiently large. (You can see from our tables below just how large.) In other words, the "not really victimized" defense is often, but not always, valid. But remember, even in the region where victimization does occur, society overall is still better off. 

##  The "happier society" response 

(Also you can see our [other computer sims](StratHonMix.html).) 

Below table shows summed utility difference (util for range minus util for approval) summed for _all_ the voters when the first _t_ voters strategize (rest honest), for 100-voter elections with 2 to 10 candidates. All utilities of candidates for voters are independent standard normal random deviates (the [simplest possible](RandElect.html) utility generator, not claimed to be especially politically realistic, but we doubt that matters much for the present purposes). Each data point is based on 350000 elections, which is not infinity, so we get some noise. Note that _every_ table entry is _positive_ , indicating range is a superior voting system to approval from the point of view of _society-wide_ utility (i.e. averaged over all voters, i.e. _both_ the honest and strategic ones) at _all_ simulation parameters here. The exceptions to that statement are the 2-candidate column and 100% strategic row. In the 2-candidate case honest [normalized](Glossary.html#normalized) range votes and approval votes are the same thing ("normalized" means rescaled so each voter's favorite candidate is scored MAX possible while her most-hated candidate scored MIN possible), and in the 100% strategic case range and approval also are the same thing at least as far as this simulation is concerned - so the first column and last row, shown pink, consist entirely of zero-centered random noise. They are only useful as a "noise-level gauge." 

%strat | Number of candidates  
---|---  
voters| 2| 3| 4| 5| 6| 7| 8| 9| 10  
0% |  0.014  |  0.338  |  0.880  |  1.311  |  1.608  |  1.858  |  2.089  |  2.272  |  2.411   
5% |  -0.016  |  0.337  |  0.840  |  1.177  |  1.427  |  1.672  |  1.834  |  1.984  |  2.132   
10% |  0.023  |  0.312  |  0.774  |  1.063  |  1.332  |  1.491  |  1.617  |  1.721  |  1.849   
15% |  -0.024  |  0.282  |  0.716  |  0.997  |  1.155  |  1.369  |  1.444  |  1.513  |  1.617   
20% |  -0.013  |  0.238  |  0.651  |  0.895  |  1.063  |  1.208  |  1.291  |  1.369  |  1.423   
25% |  0.015  |  0.231  |  0.582  |  0.792  |  0.970  |  1.069  |  1.116  |  1.221  |  1.230   
30% |  0.027  |  0.225  |  0.536  |  0.712  |  0.853  |  0.984  |  1.010  |  1.040  |  1.070   
35% |  0.020  |  0.209  |  0.479  |  0.641  |  0.758  |  0.826  |  0.883  |  0.912  |  0.909   
40% |  0.004  |  0.168  |  0.447  |  0.600  |  0.692  |  0.748  |  0.750  |  0.820  |  0.772   
45% |  -0.012  |  0.184  |  0.416  |  0.532  |  0.599  |  0.651  |  0.670  |  0.677  |  0.667   
50% |  -0.006  |  0.174  |  0.341  |  0.463  |  0.539  |  0.575  |  0.547  |  0.572  |  0.587   
55% |  -0.000  |  0.162  |  0.309  |  0.394  |  0.489  |  0.449  |  0.471  |  0.517  |  0.513   
60% |  0.006  |  0.107  |  0.284  |  0.344  |  0.394  |  0.420  |  0.394  |  0.389  |  0.412   
65% |  -0.008  |  0.117  |  0.252  |  0.275  |  0.330  |  0.335  |  0.356  |  0.327  |  0.331   
70% |  0.023  |  0.100  |  0.160  |  0.263  |  0.252  |  0.267  |  0.307  |  0.338  |  0.250   
75% |  -0.029  |  0.072  |  0.136  |  0.212  |  0.270  |  0.237  |  0.212  |  0.247  |  0.207   
80% |  0.009  |  0.047  |  0.144  |  0.193  |  0.187  |  0.190  |  0.175  |  0.201  |  0.161   
85% |  -0.018  |  0.063  |  0.082  |  0.122  |  0.125  |  0.160  |  0.156  |  0.101  |  0.127   
90% |  0.006  |  0.016  |  0.091  |  0.077  |  0.085  |  0.094  |  0.096  |  0.108  |  0.089   
95% |  -0.005  |  0.025  |  0.050  |  0.053  |  0.055  |  0.037  |  0.085  |  0.036  |  0.061   
100% |  0.048  |  0.009  |  -0.011  |  -0.014  |  0.016  |  0.039  |  0.004  |  -0.016  |  -0.013   
  
In summary, up to a small amount of statistical noise that should go away if we devote enough computer time to this, the "happier society" response seems completely valid. 

##  The "not really victimized" response 

Below table shows summed utility difference (util for approval minus util for range) for the _100-t_ honest normalized-range-voters _only_ (the other _t_ are strategic), for 100-voter elections with 2 to 10 candidates. The "strategic" voters are using mean-candidate-utility as an approval-theshhold, because that is the [best strategy we know of](RVstrat3.html) for 100-voter elections. Each data point is based on 350000 elections, which is not infinity so we get some noise. Nevertheless the noise is small enough that the _boundary_ (shown **bold**) between the honest-voters-prefer-range and honest-voters-prefer-approval regions is now becoming visible. (The former region has negative entries, the latter positive.) There _isn't_ any boundary in the 2-candidate case, though. That's because in the 2-candidate case, honest normalized range voters and approval voters are the same thing. So the 2-candidate column, shown pink, is just entirely random noise equally likely to be positive or negative. The limit as we approach 100% strategic voters (last row) would also be random noise. 

We find that with mostly honest voters, range is better than approval (for the honest voters) utility-wise. That's not surprising since range seems obviously a better voting system than approval if there is a lot of voter honesty. Then as we increase the strategic-voter percentage, at some point this flips, and now the honest voters prefer approval over range so that they do not get "victimized" by the strategic voters. That also makes sense. 

Note that a substantial region of this table is negative (i.e. range better in everybody's view). That fact would have to be the basis for any "not really victimized" defense. It appears this defense has some, albeit not a huge amount of, validity; and it has more validity if there are 3 or 4 candidates, than if there are 10. 

%strat | Number of candidates  
---|---  
voters| 2| 3| 4| 5| 6| 7| 8| 9| 10  
0% |  -0.043  |  -0.328  |  -0.903  |  -1.290  |  -1.649  |  -1.902  |  -2.092  |  -2.242  |  -2.405   
5% |  -0.034  |  -0.327  |  -0.710  |  -1.059  |  -1.238  |  -1.440  |  -1.571  |  -1.662  |  -1.765   
10% |  -0.008  |  -0.229  |  -0.568  |  -0.823  |  -0.961  |  -1.072  |  -1.125  |  -1.209  |  -1.213   
15% |  0.021  |  -0.189  |  -0.461  |  -0.609  |  -0.707  |  -0.738  |  -0.758  |  -0.795  |  -0.772   
20% |  -0.015  |  -0.181  |  -0.363  |  -0.441  |  -0.466  |  -0.490  |  -0.460  |  -0.422  |  -0.390   
25% |  0.015  |  -0.108  |  -0.262  |  -0.293  |  -0.267  |  -0.229  |  -0.213  |  **-0.145** |  **-0.122**  
30% |  -0.018  |  -0.111  |  -0.153  |  -0.149  |  -0.109  |  **-0.032** |  **0.013** |  **0.099** |  **0.170**  
35% |  0.021  |  -0.053  |  -0.068  |  **-0.033** |  **0.013** |  0.080  |  0.167  |  0.273  |  0.372   
40% |  0.031  |  **-0.024** |  **-0.030** |  **0.012** |  0.125  |  0.205  |  0.320  |  0.397  |  0.515   
45% |  0.009  |  **0.012** |  **0.038** |  0.071  |  0.221  |  0.276  |  0.411  |  0.501  |  0.618   
50% |  -0.015  |  **0.001** |  0.061  |  0.153  |  0.264  |  0.371  |  0.487  |  0.593  |  0.655   
55% |  0.016  |  0.083  |  0.071  |  0.213  |  0.326  |  0.423  |  0.537  |  0.612  |  0.716   
60% |  -0.017  |  0.049  |  0.128  |  0.247  |  0.311  |  0.466  |  0.552  |  0.661  |  0.736   
65% |  0.013  |  0.027  |  0.124  |  0.235  |  0.346  |  0.453  |  0.532  |  0.611  |  0.707   
70% |  0.007  |  0.058  |  0.115  |  0.240  |  0.339  |  0.429  |  0.525  |  0.598  |  0.652   
75% |  -0.007  |  0.043  |  0.121  |  0.204  |  0.315  |  0.384  |  0.460  |  0.561  |  0.606   
80% |  0.006  |  0.048  |  0.137  |  0.188  |  0.265  |  0.356  |  0.415  |  0.473  |  0.525   
85% |  -0.018  |  0.027  |  0.105  |  0.178  |  0.224  |  0.276  |  0.332  |  0.386  |  0.419   
90% |  -0.000  |  0.032  |  0.067  |  0.118  |  0.159  |  0.207  |  0.239  |  0.247  |  0.292   
95% |  -0.011  |  0.017  |  0.039  |  0.067  |  0.086  |  0.101  |  0.118  |  0.148  |  0.149   
100% |  ******  |  ******  |  ******  |  ******  |  ******  |  ******  |  ******  |  ******  |  ******   
  
##  What is the incentive to be strategic rather than honest? 

Below table shows difference in average utility (AvgUtil for strategists minus AvgUtil for honest voters) when the first _t_ voters strategize (remaining _100-t_ voters honest), for 100-voter elections with 2 to 10 candidates. Each data point based on 1500000 elections. The "strategic" voters are using mean-candidate-utility as an approval-theshold. The more positive the table entry, the more incentive an honest voter has to strategize. The 2-candidate column again is pure noise since strategic and honest voting then are the same thing, so is only useful as a "noise-level gauge." 

These results indicate that you have the most incentive to strategize if there are few strategic voters and many candidates. In practice we expect there will be effectively fewer candidates than there actually are (since many will be "no hopers") in which case the incentive to strategize will be reduced. 

We thank raphfrk both for suggesting this experiment and for donating the computer time. 

%strat | Number of candidates  
---|---  
voters| 2| 3| 4| 5| 6| 7| 8| 9| 10  
5% |  0.000  |  0.003  |  0.011  |  0.018  |  0.025  |  0.032  |  0.038  |  0.045  |  0.050   
10% |  -0.000  |  0.004  |  0.010  |  0.018  |  0.024  |  0.031  |  0.037  |  0.043  |  0.048   
15% |  -0.000  |  0.004  |  0.010  |  0.018  |  0.024  |  0.030  |  0.036  |  0.042  |  0.047   
20% |  -0.000  |  0.004  |  0.010  |  0.017  |  0.023  |  0.029  |  0.035  |  0.040  |  0.045   
25% |  0.000  |  0.004  |  0.010  |  0.017  |  0.023  |  0.029  |  0.034  |  0.040  |  0.044   
30% |  0.000  |  0.004  |  0.010  |  0.016  |  0.023  |  0.028  |  0.034  |  0.039  |  0.043   
35% |  0.000  |  0.004  |  0.010  |  0.017  |  0.022  |  0.027  |  0.033  |  0.037  |  0.042   
40% |  -0.000  |  0.004  |  0.010  |  0.016  |  0.022  |  0.027  |  0.032  |  0.037  |  0.041   
45% |  -0.000  |  0.004  |  0.010  |  0.016  |  0.022  |  0.027  |  0.031  |  0.036  |  0.040   
50% |  0.000  |  0.004  |  0.010  |  0.015  |  0.022  |  0.026  |  0.031  |  0.035  |  0.039   
55% |  0.000  |  0.004  |  0.009  |  0.015  |  0.021  |  0.026  |  0.030  |  0.035  |  0.038   
60% |  -0.000  |  0.004  |  0.009  |  0.015  |  0.020  |  0.025  |  0.030  |  0.034  |  0.037   
65% |  -0.000  |  0.004  |  0.009  |  0.015  |  0.020  |  0.025  |  0.029  |  0.033  |  0.037   
70% |  0.000  |  0.004  |  0.009  |  0.015  |  0.020  |  0.025  |  0.029  |  0.033  |  0.036   
75% |  0.000  |  0.003  |  0.009  |  0.015  |  0.020  |  0.024  |  0.028  |  0.032  |  0.035   
80% |  -0.000  |  0.004  |  0.009  |  0.014  |  0.020  |  0.024  |  0.028  |  0.032  |  0.035   
85% |  0.000  |  0.003  |  0.009  |  0.014  |  0.019  |  0.023  |  0.027  |  0.031  |  0.034   
90% |  -0.000  |  0.003  |  0.009  |  0.014  |  0.019  |  0.023  |  0.026  |  0.030  |  0.033   
95% |  -0.001  |  0.004  |  0.009  |  0.014  |  0.019  |  0.023  |  0.027  |  0.030  |  0.033   
  
##  The simulation program 

You can download the [entire code](shenhack.c). 

  


[Return to main page](RangeVoting.html)

[](http://www.statcounter.com/)
