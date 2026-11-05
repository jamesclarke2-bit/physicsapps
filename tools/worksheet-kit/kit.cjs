/* Worksheet kit: helpers for building a consistent Word worksheet with docx-js.
   Usage:  const K = require('../../tools/worksheet-kit/kit.cjs');   // from <app>/worksheet/
   House rules baked in (see docs/TEACHING-RULES.md): A4, Arial, orange question numbers, ruled answer lines,
   A-level style tables (quantity / unit in headings), native Word equations, teacher page separate and labelled.
   Text mini-markup: **bold**, ^{sup}, _{sub}.  Use \u0304 for a bar over a letter (v\u0304, t\u0304). */
const fs=require('fs');
const D=require('docx');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,ImageRun,Header,Footer,PageNumber,AlignmentType,WidthType,BorderStyle,ShadingType,HeadingLevel,PageOrientation,LevelFormat,Math:M,MathRun,MathFraction,MathSubScript,MathSuperScript,MathRadical,ExternalHyperlink,PageBreak,VerticalAlign,TableLayoutType}=D;
const FONT="Arial",BL="1F5FA8",OR="D9660B",INK="1D2733",GR="9AA5B1",LIGHT="EEF3F9",ORL="FDF1E6";
const PW=9638,LW=14570;

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
const H1=(s,o={})=>new Paragraph({heading:HeadingLevel.HEADING_1,keepNext:true,pageBreakBefore:!!o.newPage,spacing:{before:300,after:140},border:{bottom:{style:BorderStyle.SINGLE,size:10,color:BL,space:3}},children:[new TextRun({text:s,font:FONT,bold:true,size:30,color:BL})]});
const H2=(s,o={})=>new Paragraph({heading:HeadingLevel.HEADING_2,keepNext:true,pageBreakBefore:!!o.newPage,spacing:{before:220,after:100},children:[new TextRun({text:s,font:FONT,bold:true,size:24,color:INK})]});
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
function img(f,w,keepNext=false){const b=fs.readFileSync(f);const W=b.readUInt32BE(16),H=b.readUInt32BE(20);return new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:60,after:60},keepNext:keepNext,children:[new ImageRun({type:'png',data:b,transformation:{width:w,height:Math.round(w*H/W)},altText:{title:f,description:f,name:f}})]});}
const CAP=(s)=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:140},keepLines:true,children:rich(s,{size:18,color:"4A5663",italics:true})});
const BOX=(children,fill=LIGHT,bc=BL)=>new Table({width:{size:PW,type:WidthType.DXA},columnWidths:[PW],rows:[new TableRow({cantSplit:true,children:[new TableCell({width:{size:PW,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,fill,color:"auto"},margins:{top:120,bottom:100,left:200,right:200},borders:{top:nb,bottom:nb,right:nb,left:{style:BorderStyle.SINGLE,size:24,color:bc}},children})]})]});
const BUL=(s,ref='b')=>new Paragraph({numbering:{reference:ref,level:0},spacing:{after:60,line:268},children:rich(s,{size:20})});
const STEP=(s)=>new Paragraph({numbering:{reference:'n',level:0},spacing:{after:70,line:268},children:rich(s,{size:20})});

const hdr=(text)=>new Header({children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:{after:0},children:[new TextRun({text:text,font:FONT,size:17,color:"6B7785"})]})]});
const ftr=()=>new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:0},children:[new TextRun({text:"Page ",font:FONT,size:17,color:"6B7785"}),new TextRun({children:[PageNumber.CURRENT],font:FONT,size:17,color:"6B7785"})]})]});
const pagePort={page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1000,left:1134,right:1134,header:500,footer:450}}};
const pageLand={page:{size:{width:11906,height:16838,orientation:PageOrientation.LANDSCAPE},margin:{top:850,bottom:750,left:1134,right:1134,header:400,footer:350}}};


module.exports={D,fs,FONT,BL,OR,INK,GR,LIGHT,ORL,PW,LW,rich,P,H1,H2,Q,SUB,NOTE,mr,frac,sub,sup,EQ,vbar,tbar,lines,gap,cell,tbl,blanks,img,CAP,BOX,BUL,STEP,hdr,ftr,pagePort,pageLand,nb,B,M,MathRadical,ExternalHyperlink,PageBreak,Packer,Document,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,WidthType,BorderStyle,ShadingType,LevelFormat,HeadingLevel,
  numbering:{config:[
    {reference:'b',levels:[{level:0,format:LevelFormat.BULLET,text:"\u2022",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:420,hanging:260}}}}]},
    {reference:'n',levels:[{level:0,format:LevelFormat.DECIMAL,text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:420,hanging:320}},run:{bold:true,color:OR}}}]}]},
  styles:{default:{document:{run:{font:FONT,size:21}}},
    paragraphStyles:[
      {id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:FONT,size:30,bold:true,color:BL},paragraph:{spacing:{before:300,after:140},keepNext:true,outlineLevel:0}},
      {id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",quickFormat:true,run:{font:FONT,size:24,bold:true,color:INK},paragraph:{spacing:{before:220,after:100},keepNext:true,outlineLevel:1}}]}};
