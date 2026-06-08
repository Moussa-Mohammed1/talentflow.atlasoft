import React, { useState } from 'react';
import Head from 'next/head';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('fr');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
  };

  return (
    <>
      <Head>
        <title>Connexion - Plateforme d'apprentissage</title>
        <meta name="description" content="Page de connexion de la plateforme" />
      </Head>

      <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex items-center justify-center p-4 md:p-8 relative overflow-hidden select-none">
        {/* Optional Subtle Background Pattern Indicator */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Branding / Info */}
          <div className="lg:col-span-5 flex flex-col items-center text-center space-y-6">
            {/* Stylized Logo Placeholder */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-24 h-24 rounded-full border-[6px] border-[#0c365a] flex items-center justify-center space-x-1">
                <div className="w-2 h-5 bg-[#0c365a] rounded-full" />
                <div className="w-2 h-2 bg-[#0c365a] rounded-full self-end mb-4" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0c365a]">
                brand<span className="font-light italic">online</span>
              </h1>
            </div>

            <p className="text-lg font-medium text-slate-700 max-w-sm leading-relaxed">
              Plateforme collaborative d'apprentissage en pédagogie active
            </p>

            <div className="inline-block bg-[#051c30] text-white text-xs px-4 py-1.5 rounded-full font-medium tracking-wide">
              Powered by <span className="font-bold">brandonline</span>
            </div>
          </div>

          {/* Right Column: Connection Card */}
          <div className="lg:col-span-7 w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 sm:p-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Connexion</h2>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <span className="text-red-500 font-bold mr-1">*</span>Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Format: exemple@mail.com
                  </p>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <span className="text-red-500 font-bold mr-1">*</span>Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                  />
                  <div className="mt-2">
                    <a href="#" className="text-xs font-medium text-blue-600 hover:underline transition-all">
                      Mot de passe oublié ?
                    </a>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold rounded-xl text-sm transition-colors duration-200"
                >
                  Se connecter
                </button>
              </form>

              {/* Language Picker Dropdown */}
              <div className="mt-5">
                <div className="relative inline-block w-full">
                  <button className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-2">
                      {/* Flag icon representation */}
                      <span className="inline-block w-4 h-3 bg-gradient-to-r from-blue-600 via-white to-red-600 rounded-sm" />
                      <span>Français</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <hr className="my-6 border-slate-100" />

              {/* Support / Help Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Vous n'avez pas encore vos identifiants ?
                </h3>
                <p className="text-xs text-slate-500">
                  Demandez votre invitation à :
                </p>
                <ul className="space-y-2 text-xs text-slate-600 pl-1">
                  <li className="flex items-start">
                    <span className="mr-2 text-slate-400">•</span>
                    <span>votre formateur ou formatrice si vous êtes apprenant</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-slate-400">•</span>
                    <span>votre responsable si vous êtes formateur ou formatrice</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-slate-400">•</span>
                    <span>
                      <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                        support@example.com
                      </a>{' '}
                      pour un accès admin
                    </span>
                  </li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}