import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './scss/index.scss'

const host = document.querySelector('#root')

if (!host) {
  throw new Error('CopyBoard mount point is missing')
}

createRoot(host).render(<App />)
