import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PlanProvider } from './common/context/PlanContext.tsx';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <PlanProvider>
            <App />
        </PlanProvider>
    </StrictMode>,
);
