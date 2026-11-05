const fs=require('fs');
const D=require('docx');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,ImageRun,Header,Footer,PageNumber,AlignmentType,WidthType,BorderStyle,ShadingType,HeadingLevel,PageOrientation,LevelFormat,Math:M,MathRun,MathFraction,MathSubScript,MathSuperScript,MathRadical,ExternalHyperlink,PageBreak,VerticalAlign,TableLayoutType}=D;
const FONT="Arial",BL="1F5FA8",OR="D9660B",INK="1D2733",GR="9AA5B1",LIGHT="EEF3F9",ORL="FDF1E6";
const PW=9638,LW=14570;
const SIM="https://jamesclarke2-bit.github.io/physicsapps/cupcake-case-drop/";

// rich text: ^{sup} _{sub}, **bold**
function rich(s,o={}){
  const out=[];const parts=s.split(/(\^\{[^}]*\}|_\{[^}]*\}|\*\*[^*]*\*\*)/);
  for(const p of parts){ if(!p)continue;
    if(p.startsWith('^{'))out.push(new TextRun({text:p.slice(2,-1),superScript:true,font:FONT,...o}));
    else if(p.startsWith('_{'))out.push(new TextRun({text:p.slice(2,-1),subScript:true,font:FONT,...o}));
    else if(p.startsWith('**'))out.push(new TextRun({font:FONT,...o,text:p.slice(2,-2),bold:true}));
    else out.push(new TextRun({text:p,font:FONT,...o}));}
  return out;}
const P=(s,o={})=>new Paragraph({spacing:{before:o.before??0,after:o.after??100,line:o.line??276},alignment:o.align,keepNext:o.keepNext,keepLines:true,children:rich(s,{size:o.size??21,color:o.color,bold:o.bold,italics:o.italics})});
const H1=(s)=>new Paragraph({heading:HeadingLevel.HEADING_1,keepNext:true,spacing:{before:300,after:140},border:{bottom:{style:BorderStyle.SINGLE,size:10,color:BL,space:3}},children:[new TextRun({text:s,font:FONT,bold:true,size:30,color:BL})]});
const H2=(s)=>new Paragraph({heading:HeadingLevel.HEADING_2,keepNext:true,spacing:{before:220,after:100},children:[new TextRun({text:s,font:FONT,bold:true,size:24,color:INK})]});
// numbered question: orange number chip + bold prompt
const Q=(n,s,o={})=>new Paragraph({keepNext:true,keepLines:true,spacing:{before:o.before??200,after:80,line:276},indent:{left:520,hanging:520},tabStops:[{type:'left',position:520}],
  children:[new TextRun({text:String(n),font:FONT,bold:true,size:24,color:OR}),new TextRun({text:"\t",font:FONT}),...rich(s,{size:21,bold:true,color:INK})]});
const SUB=(l,s)=>new Paragraph({keepNext:true,keepLines:true,spacing:{after:70,line:276},indent:{left:960,hanging:440},tabStops:[{type:'left',position:960}],
  children:[new TextRun({text:l,font:FONT,bold:true,size:21,color:OR}),new TextRun({text:"\t",font:FONT}),...rich(s,{size:21})]});
const NOTE=(s)=>new Paragraph({spacing:{after:80,line:276},indent:{left:520},children:rich(s,{size:19,color:"4A5663",italics:true})});

// maths
const mr=(t)=>new MathRun(t);
const frac=(a,b)=>new MathFraction({numerator:a,denominator:b});
const sub=(b,s)=>new MathSubScript({children:[mr(b)],subScript:[mr(s)]});
const sup=(b,s)=>new MathSuperScript({children:[mr(b)],superScript:[mr(s)]});
const EQ=(children,label)=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:80,after:120},keepLines:true,children:[new M({children})]});
const vbar=()=>mr("v̄"), tbar=()=>mr("t̄");

// answer lines
const nb={style:BorderStyle.NONE,size:0,color:"FFFFFF"};
function lines(n,w=PW,h=430,indent=0){
  const rows=[];for(let i=0;i<n;i++)rows.push(new TableRow({height:{value:h,rule:'exact'},cantSplit:true,children:[new TableCell({width:{size:w-indent,type:WidthType.DXA},borders:{top:nb,left:nb,right:nb,bottom:{style:BorderStyle.SINGLE,size:4,color:"B5BEC8"}},children:[new Paragraph({children:[]})]})]}));
  return new Table({width:{size:w-indent,type:WidthType.DXA},columnWidths:[w-indent],indent:{size:indent,type:WidthType.DXA},rows});}
const gap=(a=80)=>new Paragraph({spacing:{after:a},children:[]});

// data table
const thin={style:BorderStyle.SINGLE,size:6,color:"6B7785"};
const B={top:thin,bottom:thin,left:thin,right:thin};
function cell(s,w,o={}){return new TableCell({width:{size:w,type:WidthType.DXA},borders:B,verticalAlign:VerticalAlign.CENTER,
  shading:o.fill?{type:ShadingType.CLEAR,fill:o.fill,color:"auto"}:undefined,margins:{top:50,bottom:50,left:80,right:80},columnSpan:o.span,
  children:[new Paragraph({alignment:o.align??AlignmentType.CENTER,spacing:{after:0,line:250},children:s?rich(s,{size:o.size??19,bold:o.bold,color:o.color}):[]})]});}
function tbl(heads,rows,widths,o={}){
  const total=widths.reduce((a,b)=>a+b,0);
  const hr=new TableRow({tableHeader:true,cantSplit:true,children:heads.map((h,i)=>cell(h,widths[i],{fill:"DCE7F5",bold:true,size:o.hsize??18}))});
  const body=rows.map(r=>new TableRow({cantSplit:true,height:{value:o.rowH??520,rule:'atLeast'},children:r.map((c,i)=>{
    const first=(i===0&&o.firstFill!==false);return cell(c,widths[i],{fill:first&&c?LIGHT:undefined,bold:first&&!!c,align:first&&c&&o.firstLeft?AlignmentType.LEFT:undefined});})}));
  return new Table({width:{size:total,type:WidthType.DXA},columnWidths:widths,rows:[hr,...body]});}
const blanks=(n,c,first)=>Array.from({length:n},(_,i)=>Array.from({length:c},(_,j)=>j===0&&first?first[i]:""));

// images
function img(f,w){const b=fs.readFileSync(f);const W=b.readUInt32BE(16),H=b.readUInt32BE(20);return new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:60,after:60},keepNext:false,children:[new ImageRun({type:'png',data:b,transformation:{width:w,height:Math.round(w*H/W)},altText:{title:f,description:f,name:f}})]});}
const CAP=(s)=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:140},keepLines:true,children:rich(s,{size:18,color:"4A5663",italics:true})});
const BOX=(children,fill=LIGHT,bc=BL)=>new Table({width:{size:PW,type:WidthType.DXA},columnWidths:[PW],rows:[new TableRow({cantSplit:true,children:[new TableCell({width:{size:PW,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill,color:"auto"},margins:{top:120,bottom:100,left:200,right:200},borders:{top:nb,bottom:nb,right:nb,left:{style:BorderStyle.SINGLE,size:24,color:bc}},children})]})]});
const BUL=(s,ref='b')=>new Paragraph({numbering:{reference:ref,level:0},spacing:{after:60,line:268},children:rich(s,{size:20})});
const STEP=(s)=>new Paragraph({numbering:{reference:'n',level:0},spacing:{after:70,line:268},children:rich(s,{size:20})});

const hdr=()=>new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:{after:0},children:[new TextRun({text:"Cupcake Case Drop  ·  Physics practical",font:FONT,size:17,color:"6B7785"})]})]});
const ftr=()=>new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:0},children:[new TextRun({text:"Page ",font:FONT,size:17,color:"6B7785"}),new TextRun({children:[PageNumber.CURRENT],font:FONT,size:17,color:"6B7785"})]})]});
const pagePort={page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1000,left:1134,right:1134,header:500,footer:450}}};
const pageLand={page:{size:{width:11906,height:16838,orientation:PageOrientation.LANDSCAPE},margin:{top:850,bottom:750,left:1134,right:1134,header:400,footer:350}}};

// ================= SECTION 1 =================
const s1=[];
s1.push(new Paragraph({spacing:{after:40},children:[new TextRun({text:"CUPCAKE CASE DROP",font:FONT,bold:true,size:46,color:BL})]}));
s1.push(new Paragraph({spacing:{after:160},children:[new TextRun({text:"Air resistance, terminal velocity and motion graphs",font:FONT,size:26,color:INK})]}));
s1.push(new Table({width:{size:PW,type:WidthType.DXA},columnWidths:[3200,3200,3238],rows:[new TableRow({children:["Name:","Class:","Date:"].map((t,i)=>new TableCell({width:{size:[3200,3200,3238][i],type:WidthType.DXA},borders:{top:nb,left:nb,right:nb,bottom:{style:BorderStyle.SINGLE,size:6,color:INK}},margins:{bottom:40},children:[new Paragraph({spacing:{before:200,after:0},children:[new TextRun({text:t,font:FONT,size:20,bold:true})]})]}))})]}));
s1.push(gap(140));
s1.push(BOX([
  P("**Aim**  Find how the mass of a falling cupcake case affects its fall time, then explain the motion using forces and graphs.",{after:60}),
  P("**Variables**  Change: number of nested cases, __n__ (mass __m__).  Measure: fall time, __t__.  Keep the same: drop height __h__, case size and shape, release method, timer.".replace(/__(\w)__/g,"$1"),{after:0}),
]));
s1.push(img("fig_rig.png",470));
s1.push(CAP("Figure 1  The experimental set-up. Release from rest with the base of the case level with the mark."));

s1.push(H1("Part 1  Plan"));
s1.push(Q(1,"Height. Choose a drop height __h__.".replace("__h__","h"),{before:80}));
s1.push(P("h = ______________ m",{after:80}));
s1.push(NOTE("Give one reason __h__ should not be too small and one reason it should not be too large.".replace("__h__","h")));
s1.push(lines(3,PW,430,520));
s1.push(Q(2,"Is the average speed of the fall equal to the terminal velocity (TV)? Explain."));
s1.push(EQ([vbar(),mr(" = "),frac([mr("h")],[tbar()])]));
s1.push(NOTE("Think: does the case reach TV straight away?"));
s1.push(lines(4,PW,430,520));
s1.push(Q(3,"Predict how the fall time changes as the number of cases increases."));
s1.push(img("pred_axes.png",300));
s1.push(CAP("Sketch your prediction on the axes."));
s1.push(NOTE("Explain your prediction using forces."));
s1.push(lines(3,PW,430,520));
s1.push(Q(4,"Why do we repeat each drop?"));
s1.push(NOTE("Give two things repeating helps you to do."));
s1.push(lines(2,PW,430,520));
s1.push(P("The uncertainty in a mean time of random readings is half the range:",{before:120,after:40}));
s1.push(EQ([mr("Δ"),mr("t"),mr(" = "),frac([mr("1")],[mr("2")]),mr("("),sub("t","max"),mr(" − "),sub("t","min"),mr(")")]));
s1.push(NOTE("Would 50 repeats make your result more accurate? Explain."));
s1.push(lines(3,PW,430,520));

// ================= SECTION 2 (landscape) =================
const s2=[];
s2.push(H1("Part 2  Collect results"));
s2.push(P("**Method**",{after:60,keepNext:true}));
["Measure the height h from the floor and mark it. Record h below.","Hold n nested cases flat, base level with the mark.","Release without pushing. Start the timer on release and stop it when the cases land.","Do 3 drops for each n. Cross out any obvious anomaly and repeat it.","Do n = 1 to 6. Mass of one case: ____________ g (measure with a balance)."].forEach(t=>s2.push(STEP(t)));
s2.push(P("h = ______________ m",{before:60,after:60,bold:true}));
s2.push(P("**Table 1**  Fall times",{after:60,keepNext:true}));
const w1=[900,1200,1250,1250,1250,1350,1700,2300,1700,1670];
s2.push(tbl(["n","m / g","t_{1} / s","t_{2} / s","t_{3} / s","t̄ / s","half range Δt / s","v̄ = h / t̄ / m s^{-1}","% unc. = Δt / t̄ × 100","notes"],blanks(6,10,["1","2","3","4","5","6"]),w1,{rowH:430}));
s2.push(P("",{after:60}));
s2.push(P("**Table 2**  Is the average speed close to TV?  (use k = m g / v̄^{2}, with m in kg)",{before:100,after:50,keepNext:true}));
const w2=[900,2300,2500,2900,3500,2470];
s2.push(tbl(["n","m / kg","W = m g / N","v̄ / m s^{-1}","k = m g / v̄^{2} / kg m^{-1}","k ÷ k (n=1)"],blanks(6,6,["1","2","3","4","5","6"]),w2,{rowH:360}));


// ================= SECTION 3 =================
const s3=[];
s3.push(H1("Part 3  Analyse"));
s3.push(P("**Table 2** If k stays constant, the cases are at TV for most of the fall. If k rises with n, what does that tell you?",{after:60,keepNext:true}));
s3.push(lines(2,PW,430,0));
s3.push(gap(100));
s3.push(P("**Graph 1**  Plot v̄ against n. Choose your own scales and draw a line or curve of best fit.",{after:60,keepNext:true}));
s3.push(img("grid_v_n.png",500));
s3.push(Q(5,"Describe the shape of your graph. Is it a straight line through the origin?",{before:80}));
s3.push(lines(2,PW,430,520));
s3.push(P("**Extension**  Plot v̄^{2} against n on the grid below. What does a straight line through the origin show?",{before:160,after:60,keepNext:true}));
s3.push(img("grid_vsq_n.png",500));
s3.push(lines(2,PW,430,0));

s3.push(H1("Forces and acceleration"));
s3.push(img("fig_fbd.png",600));
s3.push(CAP("Figure 2  Free body diagrams for a falling case. W is weight, D is air resistance (drag)."));
s3.push(P("Weight and drag, then Newton’s second law:",{after:30,keepNext:true}));
s3.push(EQ([mr("W = m g"),mr("        "),mr("D = k "),sup("v","2")]));
s3.push(EQ([mr("a = "),frac([mr("m g − D")],[mr("m")]),mr(" = g − "),frac([mr("D")],[mr("m")])]));
s3.push(Q(6,"Complete the table for stages A, B and C in Figure 2.",{before:100}));
s3.push(tbl(["Stage","speed","D compared with W","resultant force","acceleration"],[["A","","","",""],["B","","","",""],["C","","","",""]],[900,1700,2500,2300,2238],{rowH:560}));
s3.push(Q(7,"Explain why D increases as the case speeds up."));
s3.push(lines(2,PW,430,520));
s3.push(Q(8,"At TV, W = D. Use this to show that v_{T} depends on the mass m:"));
s3.push(EQ([mr("m g = k "),sub("v","T"),mr("²"),mr("      →      "),sub("v","T"),mr(" = "),new MathRadical({children:[frac([mr("m g")],[mr("k")])]})]));
s3.push(NOTE("Why does a case made of 4 nested cases have a greater TV than 1 case?"));
s3.push(lines(3,PW,430,520));

s3.push(H1("Motion graphs"));
s3.push(P("Figure 3 shows the motion of 1 case dropped from 3 m.",{after:40,keepNext:true}));
s3.push(img("fig_motion_given.png",620));
s3.push(CAP("Figure 3  (a) distance fallen–time, (b) velocity–time and (c) acceleration–time graphs for 1 case."));
s3.push(Q(9,"Use the graphs.",{before:80}));
s3.push(SUB("(a)","Read the terminal velocity from graph (b):  v_{T} = ________________ m s^{-1}"));
s3.push(SUB("(b)","About how long does it take to reach v_{T}?  t = ________________ s"));
s3.push(SUB("(c)","Find the gradient of graph (a) after 0.5 s:  ________________ m s^{-1}.  What does it equal?"));
s3.push(lines(1,PW,430,960));
s3.push(SUB("(d)","The area under graph (b) is the distance fallen. Estimate it:  ________________ m"));
s3.push(SUB("(e)","Use forces to explain the shape of graph (c)."));
s3.push(lines(3,PW,430,960));
s3.push(Q(10,"Sketch the graphs for 4 cases from the same height (3 m)."));
s3.push(NOTE("The grey line is 1 case. Draw 4 cases in pen on each graph. Mark v_{T} on (b) and show where it lands on (a)."));
s3.push(img("fig_motion_sketch.png",620));
s3.push(CAP("Figure 4  Sketch the graphs for 4 cases."));
s3.push(NOTE("Compare 1 case and 4 cases: terminal velocity, time to reach it, and fall time."));
s3.push(lines(3,PW,430,520));

s3.push(H1("Part 4  Design and tweak"));
s3.push(P("A better experiment has the case falling at a near-constant speed for longer. Use the simulation to test designs: ",{after:30}));
s3.push(new Paragraph({spacing:{after:100},children:[new ExternalHyperlink({link:SIM,children:[new TextRun({text:SIM,font:FONT,size:19,style:"Hyperlink",color:BL,underline:{}})]})]}));
s3.push(BOX([
  P("**Targets for a good design**",{after:50}),
  EQ([frac([vbar()],[sub("v","T")]),mr(" × 100% ≥ 90%"),mr("          "),frac([mr("Δt")],[tbar()]),mr(" × 100% ≤ 5%")]),
],ORL,OR));
s3.push(gap(60));
s3.push(H2("Task A  Drop height   (1 case, hand stopwatch)"));
s3.push(tbl(["h / m","t̄ / s","Δt / s","% unc. in t","v̄ / m s^{-1}","v̄ ÷ v_{T} (%)"],blanks(5,6,["0.5","1.0","1.5","2.0","3.0"]),[1300,1500,1500,1700,1800,1838],{rowH:470}));
s3.push(NOTE("Which height is best? What stops you using a much taller drop?"));
s3.push(lines(2,PW,430,520));
s3.push(H2("Task B  Timing method"));
s3.push(tbl(["Timer","timer uncertainty / s","% unc. at h = 1 m","% unc. at h = 3 m"],[["Hand stopwatch","","",""],["Video (frame by frame)","","",""],["Light gates","","",""]],[2900,2300,2219,2219],{rowH:470,firstLeft:true}));
s3.push(NOTE("Rule: the fall time should be at least 10 × the timer uncertainty. Which timers pass at 1 m? Why does this rule matter?"));
s3.push(lines(2,PW,430,520));
s3.push(H2("Task C  Case area   (3 cases, h = 2 m)"));
s3.push(tbl(["Area A / cm²","v_{T} / m s^{-1}","v̄ / m s^{-1}","v̄ ÷ v_{T} (%)"],blanks(3,4,["20","40","60"]),[2300,2400,2469,2469],{rowH:470}));
s3.push(NOTE("Drag constant k increases with A. Explain how a larger area changes v_{T} and v̄ ÷ v_{T}."));
s3.push(lines(2,PW,430,520));
s3.push(H2("Task D  Challenge   (3 cases)"));
s3.push(P("Choose the area, height and timer so that both targets are met. Then raise the first target to 95%.",{after:60,keepNext:true}));
s3.push(tbl(["Try","A / cm²","h / m","Timer","v̄ ÷ v_{T} (%)","% unc. in t","Both met?"],blanks(4,7,["1","2","3","4"]),[800,1200,1200,1700,1900,1500,1338],{rowH:470}));
s3.push(NOTE("Describe your best design and say why each choice helped."));
s3.push(lines(3,PW,430,520));

s3.push(H1("Part 5  Conclusion and evaluation"));
s3.push(Q(11,"State how fall time depends on mass. Support your answer with data from Table 1.",{before:80}));
s3.push(lines(3,PW,430,520));
s3.push(Q(12,"Which source of uncertainty was biggest in your experiment? Suggest one improvement."));
s3.push(lines(3,PW,430,520));
s3.push(Q(13,"How could you check that the case reached terminal velocity?"));
s3.push(lines(3,PW,430,520));

// ---- teacher page ----
s3.push(new Paragraph({children:[new PageBreak()]}));
s3.push(new Paragraph({spacing:{after:100},border:{bottom:{style:BorderStyle.SINGLE,size:10,color:OR,space:3}},children:[new TextRun({text:"Teacher answers  (remove before printing)",font:FONT,bold:true,size:30,color:OR})]}));
s3.push(P("**Model used** (also in the simulation): drag D = kv² with k = 0.0037 kg m^{-1} at 40 cm² (k ∝ area), mass 0.55 g per case, v_{T} = √(mg/k). v_{T} is 1.21 m s^{-1} for 1 case and 2.42 m s^{-1} for 4 cases.",{after:80}));
s3.push(P("**Expected results**  (h = 2 m, 40 cm²)",{after:50,keepNext:true}));
s3.push(tbl(["n","v_{T} / m s^{-1}","t / s","v̄ / m s^{-1}","v̄ ÷ v_{T}","k = mg/v̄^{2} / kg m^{-1}"],[["1","1.21","1.74","1.15","95%","0.0041"],["2","1.71","1.29","1.55","91%","0.0045"],["3","2.09","1.10","1.81","87%","0.0049"],["4","2.42","1.00","2.00","83%","0.0054"],["5","2.70","0.93","2.15","80%","0.0058"],["6","2.96","0.88","2.26","76%","0.0063"]],[800,1700,1400,1700,1700,2338],{rowH:380}));
s3.push(gap(60));
[
"**Q1** Too small: fall is short and the timing uncertainty is a large percentage; the case never reaches TV. Too large: harder to release and see, case drifts or tumbles, ceiling or space limits.",
"**Q2** No. The case accelerates at first, so average speed is below TV. The longer the fall at TV, the closer v̄ is to v_{T} (95% for 1 case at 2 m, 83% for 4 cases).",
"**Q3** Fall time decreases as n increases, with diminishing change (curve, not straight line): weight rises with n but area stays the same, so TV is larger.",
"**Q4** Repeats show the spread, identify anomalies and give a mean. Uncertainty is half the range and does not shrink with more repeats; a faulty method stays wrong however often it is repeated.",
"**Graph 1** A curve through the origin that flattens (v_{T} ∝ √m). v̄^{2} against n is close to a straight line through the origin, so v^{2} ∝ m.",
"**Q6** A: v = 0, D = 0, resultant = W (down), a = g. B: 0 < v < v_{T}, D < W, resultant = W − D, a < g. C: v = v_{T}, D = W, resultant = 0, a = 0.",
"**Q7** Drag depends on v^{2}: D = kv².",
"**Q8** Heavier means a larger W, so D must be larger to balance it, so v must be larger. For 4 cases the area is the same but W is 4×, so v_{T} is 2×.",
"**Q9** (a) about 1.2 m s^{-1} (b) about 0.3 to 0.4 s (c) about 1.2 m s^{-1}: equals the velocity (d) 3 m (e) a starts at g, falls as D grows, reaches 0 when D = W.",
"**Q10** 4 cases: v_{T} about 2.4 m s^{-1}, a longer time to reach it (about 0.5 s), same acceleration g at the start, lands at about 1.4 s (1 case: 2.6 s).",
"**Table 2** k rises with n because v̄ is below v_{T} by more for heavier cases (v̄ ÷ v_{T} falls). Only the lightest cases are at TV for most of the fall.",
"**Task A** (stopwatch ±0.07 s, 1 case) % unc. at 1 m is 7.7%, at 3 m 3.0%. v̄ ÷ v_{T} at 0.5/1/1.5/2/3 m is 83/91/94/95/97% (1 case) and 57/71/79/83/88% (4 cases).",
"**Task B** Video and light gates both give about 3.0% (set by release and flutter). Stopwatch is limited by reaction time.",
"**Task C** 20/40/60 cm²: v_{T} = 2.96/2.09/1.71 m s^{-1}; v̄ ÷ v_{T} = 76/87/91% at 2 m. Larger area, larger k, lower v_{T}, so TV is reached sooner relative to the fall.",
"**Task D** 3 cases at 40 cm² need about 3 m for 90% (90.7%), at 60 cm² about 1.9 m, and more than 3 m at 20 cm². Stopwatch uncertainty is 4.4% at 3 m, so it passes 5% only at 3 m or more; video or gates give about 3.0%.",
].forEach(t=>s3.push(BUL(t)));

const doc=new Document({
  creator:"James Clarke",title:"Cupcake Case Drop",
  styles:{default:{document:{run:{font:FONT,size:21}}},
    paragraphStyles:[
      {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:FONT,size:30,bold:true,color:BL},paragraph:{spacing:{before:300,after:140},keepNext:true,outlineLevel:0}},
      {id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:FONT,size:24,bold:true,color:INK},paragraph:{spacing:{before:220,after:100},keepNext:true,outlineLevel:1}}]},
  numbering:{config:[
    {reference:'b',levels:[{level:0,format:LevelFormat.BULLET,text:"•",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:420,hanging:260}}}}]},
    {reference:'n',levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:420,hanging:320}},run:{bold:true,color:OR}}}]}]},
  sections:[
    {properties:pagePort,headers:{default:hdr()},footers:{default:ftr()},children:s1},
    {properties:pageLand,headers:{default:hdr()},footers:{default:ftr()},children:s2},
    {properties:pagePort,headers:{default:hdr()},footers:{default:ftr()},children:s3}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("Cupcake_Case_Drop_worksheet.docx",b);console.log("written")});
