import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import QuickAccessSurface from './components/QuickAccessDrawer.jsx'
import './scss/index.scss'

const host = document.querySelector('#root')

if (!host) {
  throw new Error('CopyBoard mount point is missing')
}

const surface = new URLSearchParams(window.location.search).get('surface')

createRoot(host).render(surface === 'quick-access' ? <QuickAccessSurface /> : <App />)
