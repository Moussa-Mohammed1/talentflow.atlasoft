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

      {/* Conteneur principal - Permet le défilement sur mobile, fixe sur desktop */}
      <div className="min-h-screen lg:h-screen w-full bg-white bg-cover bg-center bg-no-repeat text-slate-800 relative overflow-y-auto lg:overflow-hidden select-none">
        
        <div className="absolute inset-0 bg-black/10 z-0" />
        
        {/* Motif de fond subtil */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [bg-size:16px_16px] z-1" />

        {/* Grille adaptative */}
        <div className="max-w-5xl mx-auto w-full min-h-screen lg:h-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 relative z-10 px-4 lg:px-0">
          
          {/* COLONNE GAUCHE - Scrollable sur mobile, centrée et fixe sur desktop */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center text-center space-y-6 pt-12 lg:pt-0 lg:h-full">
            <div className="flex flex-col items-center space-y-2">
              {/* Logo avec bordure blanche pour ressortir sur le fond sombre */}
              <div className="w-40 h-40 rounded-full border-none flex items-center justify-center overflow-hidden">
                <img 
                  src="/images/logo.png"
                  alt="Logo 3GCOM" 
                  className="w-full h-full object-contain p-2" 
                />
              </div>
              {/* <h1 className="text-3xl font-bold tracking-tight text-black">
                3GCOM <span className="font-light italic">en ligne</span>
              </h1> */}
            </div>

            <p className="inline-block bg-blue-900 text-white font-bold text-xs max-w-sm leading-relaxed px-5 py-2 rounded-full text-center">
              Optimisez l'identification et le suivi des talents
            </p>
          </div>

          {/* COLONNE DROITE - S'intègre au défilement global sur mobile, défilement interne sur desktop */}
          <div className="lg:col-span-7 w-full lg:h-full lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            
            {/* Wrapper interne */}
            <div className="w-full flex flex-col items-center justify-center py-2 lg:py-4">
              
              {/* LA CARTE DE CONNEXION */}
                <LoginForm/>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}