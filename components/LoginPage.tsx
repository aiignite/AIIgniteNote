
import React, { useState, useId } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, password: string, username: string) => Promise<{ success: boolean; message?: string }>;
  externalMessage?: { type: 'success' | 'error', text: string } | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister, externalMessage }) => {
  const baseId = useId();
  const theme = useThemeStore();
  const { t } = useLanguageStore();
  const currentTheme = theme.getTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localMessage, setLocalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Combine local and external messages
  const message = localMessage || externalMessage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setLocalMessage(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        const result = await onRegister(email, password, username);
        if (result.success) {
          setLocalMessage({ type: 'success', text: result.message || 'Registration successful! Please check your email to verify your account.' });
          // Clear form
          setEmail('');
          setPassword('');
          setUsername('');
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      setLocalMessage({ type: 'error', text: error?.message || (isLogin ? 'Login failed' : 'Registration failed') });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fff7ed] dark:bg-[#0c1419] relative overflow-hidden font-display">
      {/* Brand Background Elements - Dynamic Theme */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-primary z-0 transition-colors duration-500"></div>
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-white/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md px-8 relative z-10 flex flex-col items-center">
        {/* Logo Section - Outside the card */}
        <div className="flex flex-col items-center mb-6 -mt-8">
           <div className="size-24 rounded-3xl overflow-hidden shadow-2xl shadow-gray-900/20 transform hover:scale-105 transition-transform duration-500">
              <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={`${baseId}-bg-gradient`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={currentTheme.gradientStart}/>
                    <stop offset="100%" stopColor={currentTheme.gradientEnd}/>
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
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6">{t.login.welcome}</h1>
           <p className="text-sm text-gray-500 mt-2">{t.login.subtitle}</p>
         </div>

        <div className="w-full bg-white dark:bg-[#15232a] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Message Display */}
            {message && (
              <div className={`p-4 rounded-xl border ${
                message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                  <div className="flex items-start gap-3">
                    <span className={`material-symbols-outlined text-lg mt-0.5 ${
                      message.type === 'success' ? 'text-green-500' : 'text-red-500'
                    }`}>{message.type === 'success' ? 'check_circle' : 'error'}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        message.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>
                        {message.text}
                      </p>
                    </div>
                  </div>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm disabled:opacity-50"
                  placeholder="Your Name"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.login.emailLabel}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.login.passwordLabel}</label>
                <a href="#" className="text-xs text-primary font-bold hover:underline">Forgot?</a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="•••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
            >
              {isLoading ? (
                <>
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>{isLogin ? t.login.signingIn : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">{isLogin ? 'login' : 'person_add'}</span>
                  <span>{isLogin ? t.login.signInBtn : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
            <p className="text-xs text-gray-500">
              {isLogin ? t.login.newHere : 'Already have an account?'} <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-bold hover:underline ml-1"
              >
                {isLogin ? t.login.createAccount : 'Sign In'}
              </button>
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
