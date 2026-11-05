const G=9.81, K=0.0037, M0=0.00055, REL=0.03;
const vT=m=>Math.sqrt(m*G/K);
const tFall=(m,h)=>{const v=vT(m);const x=G*h/(v*v);return (v/G)*(x+Math.log(1+Math.sqrt(1-Math.exp(-2*x))));};
const sOf=(m,t)=>{const v=vT(m),z=G*t/v;return (v*v/G)*(z+Math.log((1+Math.exp(-2*z))/2));};
const vOf=(m,t)=>vT(m)*Math.tanh(G*t/vT(m));
module.exports={G,K,M0,REL,vT,tFall,sOf,vOf};
if(require.main===module){
 for(const n of [1,2,3,4,6,8]){const m=n*M0;
  console.log('n',n,'vT',vT(m).toFixed(2),[0.5,1,1.5,2,3].map(h=>{const t=tFall(m,h);return h+'m t='+t.toFixed(2)+' r='+(h/t/vT(m)*100).toFixed(0)+'%';}).join(' | '));}
 // check s(t) inverse
 const m=3*M0,h=2,t=tFall(m,h);console.log('inv check',sOf(m,t),'target',h);
 // uncertainty
 for(const [nm,s] of [['stopwatch',0.07],['video',0.01],['gates',0.003]]){
  console.log(nm,[1,2,3].map(h=>{const m=1*M0,t=tFall(m,h);return h+'m:'+(100*Math.sqrt(s*s+(REL*t)**2)/Math.sqrt(3)/t).toFixed(1)+'%';}).join(' '));}
}
