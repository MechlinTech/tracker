import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './lib/msalConfig';
import App from './App.tsx';
import './index.css';

// Initialize MSAL
const msalInstance = new PublicClientApplication(msalConfig);

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
      cacheTime: 3600000,
      suspense: false
    }
  }
});

// Report web vitals
const reportWebVitals = async () => {
  const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
  getCLS(() => {});
  getFID(() => {});
  getFCP(() => {});
  getLCP(() => {});
  getTTFB(() => {});
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MsalProvider>
  </StrictMode>
);

// Report web vitals in production
if (import.meta.env.PROD) {
  reportWebVitals();
}