import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const app = (
  <React.StrictMode>
    <BrowserRouter>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')).render(app)

