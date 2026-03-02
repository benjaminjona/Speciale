import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import {Provider} from "./src/components/ui/provider.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
     <App />
    </Provider>

  </StrictMode>,
)
