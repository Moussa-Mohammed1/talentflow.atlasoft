"use client";
import Head from 'next/head';
import LoginForm from '@/components/auth/LoginForm';
export default function LoginPage() {
  return (
    <> 
      <Head>
        <title>Connexion - TalentFlow</title>
        <meta name="description" content="Page de connexion de la plateforme" />
      </Head>

       
      <div className="min-h-screen lg:h-screen w-full bg-white bg-cover bg-center bg-no-repeat text-slate-800 relative overflow-y-auto lg:overflow-hidden select-none">
        
        <div className="absolute inset-0 bg-black/10 z-0" />
        
     
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [bg-size:16px_16px] z-1" />

    
        <div className="max-w-5xl mx-auto w-full min-h-screen lg:h-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 relative z-10 px-4 lg:px-0">
          
           
          <div className="lg:col-span-5 flex flex-col items-center justify-center text-center space-y-6 pt-12 lg:pt-0 lg:h-full">
            <div className="flex flex-col items-center space-y-2">
               
              <div className="w-40 h-40 rounded-full border-none flex items-center justify-center overflow-hidden">
                <img 
                  src="/images/logo.png"
                  alt="Logo 3GCOM" 
                  className="w-full h-full object-contain p-2" 
                />
              </div>
               
            </div>

            <p className="inline-block bg-blue-900 text-white font-bold text-xs max-w-sm leading-relaxed px-5 py-2 rounded-full text-center">
              Recrutement intelligent, automatisé et entièrement traçable.
            </p>
          </div>

           <div className="lg:col-span-7 w-full lg:h-full lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            
            
            <div className="w-full flex flex-col items-center justify-center py-2 lg:py-4">
              
               
                <LoginForm/>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}