# Nuclear fission reactor (version 1 built; physics agreed in outline by James)

## Learning goal and misconceptions
Students run a reactor and discover why each part is there, and follow the energy from the nuclear store to electricity.
Misconceptions targeted: "the moderator absorbs neutrons" (control rods absorb, moderator slows); "energy comes from burning"; "shutdown means no heat left"; "control rods make the reactor safe by themselves".

## Scope of version 1 (agreed)
Explore mode, live reactor with control rods, energy pathway, power calculation. Missions, nuclear waste and ethics, teacher mode and worksheet in a second pass.

## Reactor type (agreed)
Water is both moderator and coolant (as in a pressurised water reactor). This keeps the diagram simple, since "coolant" is not explicit on the specification. The app says clearly that other designs exist (graphite or heavy water moderators, gas or liquid metal coolants).

## Model (proposed, for James to agree)
All in `model.js`, stepped with a fixed time step. Time is slowed so cause and effect is visible. This is stated on screen.

**Chain reaction.** Control rod withdrawal w from 0 (fully in) to 1 (fully out).
- Kept qualitative (James: the temperature feedback is beyond the syllabus, so it is dropped). Rod insertion i from 0 (out) to 1 (in): k = 0.88 + 0.16 (1 − i). Critical (k = 1) with the rods 25 % in. Without the moderator k is multiplied by 0.6. The screen says "each fission causes about k more fissions".
- Relative neutron population n: dn/dt = (k − 1) n / τ, with τ = 0.2 s (real: a fraction of a second between neutron generations, slowed for the screen). A small neutron source keeps n above 10⁻⁴.
- Labels: k below 0.995 Subcritical, 0.995 to 1.005 Critical, above 1.005 Supercritical.

**Power and fissions.**
- Thermal power P = n × 900 MW (n = 1 is full power).
- Energy per fission 3.2 × 10⁻¹¹ J (200 MeV), so 900 MW is 2.8 × 10¹⁹ fissions per second.
- Decay heat: 6 % of the energy of each fission is released later (time constant 60 s here, about 10 minutes in reality), so steady heat made equals P and after shutdown the core still makes heat. Cooling is still needed.

**Heat.**
- Core heat capacity C = 60 MW s/°C: C dT/dt = 0.94 P + P_decay − Q, with Q = h × f × (T − 20 °C), f the coolant pump flow from 0 to 1 and h chosen so that full power at f = 1 sits at 300 °C.
- Steam fraction = share of Q that boils water, shown as steam in the loop.
- Electrical output = 0.35 × Q × turbine on (thermal efficiency 35 %). The other 65 % is wasted as heat to the cooling tower or sea.

**Thresholds (shown as gauges).** Alarm at 340 °C. Fuel damage above 600 °C. Meltdown sequence above 900 °C. Automatic shutdown (scram, all rods in) at 350 °C is ON by default; the student can switch it off in Challenge mode to see what the safety systems are for. The meltdown is shown responsibly, with the real safeguards named (multiple safety systems, containment, shielding).

## Variables
Student changes: rod position, coolant pump on/off and speed, turbine on/off, start, scram, automatic shutdown on/off (Challenge only). Extension mode: energy per fission, power, efficiency.
Student sees: k and status, neutron population, fission rate, core temperature, thermal power, electrical output.

## Explore mode: counterfactuals (switches)
Remove moderator: fast neutrons escape, k falls to about 0.6, chain reaction dies. Remove control rods: k at 1.02 with no way to lower it, power climbs. Remove coolant: Q falls to 0, T rises. Remove shielding: radiation dose at the outside wall shown on a gauge.

## Energy pathway
Nuclear store of uranium → kinetic energy of fission fragments and neutrons → internal energy of water (moderator and coolant) → steam (kinetic and internal) → kinetic energy of turbine → electrical energy. Neutron collisions with water particles are animated (fast neutron, slower neutron, water particle gains kinetic energy). Wording: "The neutrons transfer energy to particles in the water through collisions. The water heats up because its particles gain kinetic energy."

## Prompts (orange THINK, in learning order)
1. Predict: what happens to the neutron population if you pull the rods out a little?
2. Predict: what does the temperature do if you stop the pump?
3. Predict: after you insert the rods fully, does the core still produce heat?
4. Calculate: fissions per second at 900 MW.

## Systematic error / uncertainty
Not applicable (no measurement experiment). Readings are model values, to 2 or 3 significant figures.

## Assumptions to confirm
Numbers above are mine: k formula, τ = 4 s, 35 % efficiency, 6 % decay heat, temperature thresholds, 900 MW.

## Built (version 1)
Tabs: Explore the parts (click a part, what/does/without, take-away switches), Run the reactor (rod and pump sliders, SCRAM, live gauges, animated neutrons, meltdown), Energy transfers (pathway with optional numbers, collision animation, check questions), Power calculation (step-by-step, adjustable). Not yet: missions, waste and ethics, teacher mode, worksheet, questions.
