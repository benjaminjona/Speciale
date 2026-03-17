import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import PlaybackPage from './pages/PlaybackPage'
import {Provider} from "./src/components/ui/provider.tsx";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {OverviewPage} from "./pages/OverviewPage.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/playback" element={<PlaybackPage />} />
            <Route path="/overview" element={<OverviewPage />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
)
