import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import {Provider} from "./src/components/ui/provider.tsx";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider>
       <App />
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
)
