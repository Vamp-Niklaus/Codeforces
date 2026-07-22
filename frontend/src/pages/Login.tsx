import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Mail, Lock, Loader2, Sparkles, AlertCircle, CheckCircle2, Terminal, Code2, Rocket, ArrowRight } from "lucide-react";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        
        if (data.user && data.session === null) {
          setMessage("Verification email sent! Please check your inbox to activate your account.");
        } else {
          setMessage("Sign up successful! You are now logged in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || "An unexpected authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-dark-950 text-slate-200 selection:bg-blue-500/30">
      
      {/* Left Panel - Branding & Visuals (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 to-black items-center justify-center p-12">
        {/* Dynamic Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        </div>
        
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-semibold mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen CP Platform</span>
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 leading-tight">
            Elevate your <br/> competitive programming.
          </h1>
          
          <p className="text-lg text-slate-400 mb-10 leading-relaxed font-light">
            An intelligent workspace designed for Codeforces. Analyze problems, read solutions, and track your progress in a distraction-free, beautifully crafted environment.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <Code2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Integrated Editor</h3>
                <p className="text-sm text-slate-500">Read problems and code solutions side-by-side.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Lightning Fast</h3>
                <p className="text-sm text-slate-500">Instant contest fetching and history syncing.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md space-y-8 relative z-10">
          
          {/* Mobile Logo (visible only on small screens) */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">CF Study Archive</h2>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              {isSignUp ? "Join the smartest way to train on Codeforces." : "Enter your details to access your dashboard."}
            </p>
          </div>

          {/* Form wrapper with premium styling */}
          <div className="bg-dark-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl">
            
            {/* Custom Tab Switcher */}
            <div className="flex p-1 bg-black/40 rounded-lg mb-8 border border-white/5 relative">
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-md transition-all duration-300 ease-out ${isSignUp ? 'left-[calc(50%+2px)]' : 'left-1'}`}
              />
              <button
                onClick={() => { setIsSignUp(false); setError(null); setMessage(null); }}
                className={`flex-1 py-2 text-sm font-medium z-10 transition-colors ${!isSignUp ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsSignUp(true); setError(null); setMessage(null); }}
                className={`flex-1 py-2 text-sm font-medium z-10 transition-colors ${isSignUp ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Sign Up
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="mt-0.5 leading-relaxed">{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="mt-0.5 leading-relaxed">{message}</span>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 mt-2 bg-white text-black hover:bg-slate-100 disabled:bg-white/50 disabled:text-black/50 font-semibold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 transition-all duration-200 ease-out group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isSignUp ? "Create account" : "Sign in"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          <p className="text-center text-xs text-slate-500 mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
