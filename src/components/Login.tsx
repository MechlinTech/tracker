import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Clock, Mail, Lock, AlertCircle } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../lib/msalConfig';
import { SilentRequest } from '@azure/msal-browser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const { instance } = useMsal();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        if (response) {
          await handleMicrosoftResponse(response);
        }
      } catch (err) {
        console.error('Redirect handling error:', err);
        setError(err instanceof Error ? err.message : 'Failed to handle Microsoft login redirect');
      }
    };

    handleRedirect();
  }, [instance]);

  const handleMicrosoftResponse = async (response: any) => {
    try {
      const accessToken = response.accessToken;
      
      // Get user info from Microsoft Graph
      const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!graphResponse.ok) {
        throw new Error('Failed to fetch user info from Microsoft Graph');
      }
      
      const graphData = await graphResponse.json();

      // Sign in with Supabase using Microsoft access token
      const { data: authData, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'azure',
        token: accessToken,
      });

      if (signInError) throw signInError;
      if (!authData.user) throw new Error('No user data returned');

      // Get or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: graphData.displayName,
            role: 'employee'
          })
          .select()
          .single();

        if (createError) throw createError;
        if (!newProfile) throw new Error('Failed to create profile');
        
        setUser(newProfile);
      } else if (profile) {
        setUser(profile);
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Microsoft auth error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during Microsoft login');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!authData.user) throw new Error('No user data returned');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('No profile found');

      setUser(profile);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error('Microsoft login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during Microsoft login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Clock className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-secondary-900">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600">
          Sign in to your account to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="flex items-center p-4 text-sm text-red-800 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-secondary-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-secondary-300 rounded-md shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M11.4 24H0V12.6H11.4V24Z" fill="#F25022"/>
                  <path d="M24 24H12.6V12.6H24V24Z" fill="#00A4EF"/>
                  <path d="M11.4 11.4H0V0H11.4V11.4Z" fill="#7FBA00"/>
                  <path d="M24 11.4H12.6V0H24V11.4Z" fill="#FFB900"/>
                </svg>
                Microsoft 365
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-secondary-500">
                  New to TimeTracker Pro?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate('/signup')}
                className="btn-secondary w-full"
              >
                Create an account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}