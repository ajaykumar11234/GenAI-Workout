import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// import 'bootstrap/dist/css/bootstrap.min.css';
// import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext' // Import your context provider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      {/* <BrowserRouter> */}
        <App />
      {/* </BrowserRouter> */}
    </AuthProvider>
  </StrictMode>,
)
