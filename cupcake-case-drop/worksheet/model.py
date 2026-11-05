import numpy as np
G=9.81;K0=0.0037;M0=0.00055;A0=40
def k(A=40):return K0*A/A0
def vT(n,A=40):return np.sqrt(n*M0*G/k(A))
def tfall(n,h,A=40):
    v=vT(n,A);x=G*h/v**2
    return (v/G)*(x+np.log(1+np.sqrt(1-np.exp(-2*x))))
def sv(n,t,A=40):
    v=vT(n,A);return v, v*np.tanh(G*t/v), (v*v/G)*np.log(np.cosh(G*t/v)), G*(1-np.tanh(G*t/v)**2)
if __name__=="__main__":
    for n in range(1,7):
        t=tfall(n,2);print(n,round(n*M0*1000,2),'vT',round(vT(n),2),'t',round(t,2),'v',round(2/t,2),'%',round(100*2/t/vT(n)),'kest',round(n*M0*G/(2/t)**2,4))
    print('3m n=1',tfall(1,3),'n=4',tfall(4,3))
