
import React, { useState, useId } from 'react';
import { useThemeStore } from '../store/themeStore';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const baseId = useId(); 
  const { getTheme } = useThemeStore();
  const theme = getTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fff7ed] dark:bg-[#0c1419] relative overflow-hidden font-display">
      {/* Brand Background Elements - Dynamic Theme */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-primary z-0 transition-colors duration-500"></div>
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-white/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md p-8 relative z-10 mt-16">
        <div className="bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl p-10">
          
          {/* Logo Section - New Design */}
          <div className="flex flex-col items-center -mt-20 mb-8">
             <div className="size-24 rounded-3xl overflow-hidden shadow-2xl shadow-gray-900/20 transform hover:scale-105 transition-transform duration-500">
               <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={`${baseId}-bg-gradient`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={theme.gradientStart}/>
                    <stop offset="100%" stopColor={theme.gradientEnd}/>
                  </linearGradient>
                  
                  <radialGradient id={`${baseId}-halo-gradient`} cx="100" cy="110" r="60" gradientUnits="userSpaceOnUse">
                    <stop offset="20%" stopColor="white" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>
                </defs>

                <rect width="200" height="200" rx="40" fill={`url(#${baseId}-bg-gradient)`}/>

                <path d="M100 148 
                         C 65 148, 55 115, 80 85 
                         C 95 65, 125 55, 105 25 
                         C 135 55, 150 95, 130 125 
                         C 120 142, 115 148, 100 148Z" 
                      fill={`url(#${baseId}-halo-gradient)`} />

                <mask id={`${baseId}-modern-fire-mask`}>
                  <path d="M100 142 
                           C 78 142, 70 115, 88 92 
                           C 98 80, 115 65, 105 40 
                           C 128 65, 138 100, 122 128 
                           C 115 140, 110 142, 100 142Z" 
                        fill="white" />
                  <path d="M101 142 
                           C 94 130, 92 115, 96 100 
                           C 100 85, 108 75, 106 40
                           H 102
                           C 104 75, 96 85, 92 100
                           C 88 115, 90 130, 97 142
                           Z" 
                        fill="black" />
                </mask>

                <path d="M100 142 
                         C 78 142, 70 115, 88 92 
                         C 98 80, 115 65, 105 40 
                         C 128 65, 138 100, 122 128 
                         C 115 140, 110 142, 100 142Z" 
                      fill="white" 
                      mask={`url(#${baseId}-modern-fire-mask)`} />

                <path d="M70 160 C 90 165, 110 165, 130 160" 
                      stroke="white" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      opacity="0.4" />
                
                <circle cx="100.5" cy="138" r="3" fill="white" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-2">Sign in to your intelligent workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
                <a href="#" className="text-xs text-primary font-bold hover:underline">Forgot?</a>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
            <p className="text-xs text-gray-500">
              New here? <a href="#" className="text-primary font-bold hover:underline">Create an account</a>
            </p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-6 text-gray-400">
          <a href="#" className="text-xs hover:text-gray-600 transition-colors">Privacy</a>
          <a href="#" className="text-xs hover:text-gray-600 transition-colors">Terms</a>
          <a href="#" className="text-xs hover:text-gray-600 transition-colors">Help</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
