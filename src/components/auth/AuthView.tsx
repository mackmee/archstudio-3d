'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePreferencesStore, Language } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import {
  Compass,
  Box,
  Calculator,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { signIn, signUp, loading, error, clearError } = useAuthStore();
  const { theme, toggleTheme, language, setLanguage } = usePreferencesStore();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValidation, setFormValidation] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormValidation(null);

    if (!email.trim() || !password.trim() || (activeTab === 'signup' && !fullName.trim())) {
      setFormValidation(getTranslation(language, 'authErrorMissingFields'));
      return;
    }

    if (password.length < 6) {
      setFormValidation(getTranslation(language, 'authErrorShortPassword'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'signin') {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          // Error is set in store
        }
      } else {
        const res = await signUp(email.trim(), password, fullName.trim());
        if (res.error) {
          // Error is set in store
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = formValidation || (error ? (
    error.includes('Invalid login credentials')
      ? getTranslation(language, 'authErrorInvalid')
      : error
  ) : null);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#090d16] dark:bg-[#090d16] text-slate-100 transition-colors duration-300">
      {/* Background Architectural Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Top Bar with Language and Theme Controls */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white font-bold text-sm tracking-wider">
            3D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                ArchStudio 3D
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {getTranslation(language, 'appSubtitle')}
            </p>
          </div>
        </div>

        {/* Right Switchers: Language & Theme */}
        <div className="flex items-center gap-3">
          {/* Language Switcher Pill */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-white/10 text-xs font-bold shadow-xs">
            {(['uz', 'ru'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-md uppercase tracking-wider transition ${
                  language === lang
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white border border-white/10 transition shadow-xs"
            title="Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content: Center Split Grid */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Side: Architectural Value Propositions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Arxitektura va Qurilish Platformasi</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
            {language === 'uz' ? (
              <>
                Xonadoningizni <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">3D-da quring</span> va smetasini oling
              </>
            ) : (
              <>
                Спроектируйте квартиру <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">в 3D</span> и рассчитайте смету
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
            {getTranslation(language, 'authTagline')}
          </p>

          {/* 3 Pillars / Feature Highlights */}
          <div className="grid grid-cols-1 gap-3.5 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {getTranslation(language, 'authFeature1Title')}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation(language, 'authFeature1Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {getTranslation(language, 'authFeature2Title')}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation(language, 'authFeature2Desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {getTranslation(language, 'authFeature3Title')}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTranslation(language, 'authFeature3Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Glassmorphic Auth Box */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50">
            {/* Tabs: Kirish vs Ro'yxatdan o'tish */}
            <div className="flex p-1 bg-slate-950/80 rounded-xl border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  clearError();
                  setFormValidation(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'signin'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {getTranslation(language, 'authSignInTab')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  clearError();
                  setFormValidation(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'signup'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {getTranslation(language, 'authSignUpTab')}
              </button>
            </div>

            {/* Error Notification Banner */}
            {displayError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="flex-1">{displayError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {getTranslation(language, 'authFullName')}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={getTranslation(language, 'authFullNamePlaceholder')}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400 transition"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {getTranslation(language, 'authEmail')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={getTranslation(language, 'authEmailPlaceholder')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {getTranslation(language, 'authPassword')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={getTranslation(language, 'authPasswordPlaceholder')}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-blue-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold transition-all duration-200 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {activeTab === 'signin'
                        ? getTranslation(language, 'authSigningIn')
                        : getTranslation(language, 'authSigningUp')}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {activeTab === 'signin'
                        ? getTranslation(language, 'authSignInSubmit')
                        : getTranslation(language, 'authSignUpSubmit')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[11px] text-slate-500">
                {language === 'uz'
                  ? 'Xavfsiz Supabase bulutli avtorizatsiya va RLS himoyasi'
                  : 'Защищенная авторизация через Supabase Cloud и RLS'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-xs text-slate-600">
        © {new Date().getFullYear()} ArchStudio 3D Pro. Built for Architectural Excellence.
      </footer>
    </div>
  );
};
