from policyengine_us import Simulation
VARS=["household_net_income","household_net_income_including_health_benefits","household_benefits","household_tax"]
def run(inc, Y=2026):
    sit={"people":{"parent":{"age":{Y:30},"employment_income":{Y:inc}},"c1":{"age":{Y:4}},"c2":{"age":{Y:8}}},
         "families":{"f":{"members":["parent","c1","c2"]}},
         "marital_units":{"m":{"members":["parent"]},"m1":{"members":["c1"]},"m2":{"members":["c2"]}},
         "tax_units":{"t":{"members":["parent","c1","c2"]}},
         "spm_units":{"s":{"members":["parent","c1","c2"]}},
         "households":{"h":{"members":["parent","c1","c2"],"state_name":{Y:"CA"}}}}
    s=Simulation(situation=sit)
    out={v:float(s.calculate(v,Y)[0]) for v in VARS}
    return out
for Y in (2025,2026):
    a=run(25000,Y);b=run(50000,Y)
    g=b["household_net_income"]-a["household_net_income"]
    print(Y,{k:round(v) for k,v in a.items()},{k:round(v) for k,v in b.items()},"kept",round(g),"EMTR",round(1-g/25000,3))
print('---')
for Y in (2025,2026):
    a=run(25000,Y);b=run(50000,Y)
    for k in ("household_net_income","household_net_income_including_health_benefits"):
        g=b[k]-a[k]; print(Y,k,round(a[k]),round(b[k]),"kept",round(g),"EMTR",round(1-g/25000,3))
