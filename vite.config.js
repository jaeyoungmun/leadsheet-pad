import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' → Vercel / Netlify / GitHub Pages 어디든 그대로 배포 가능
export default defineConfig({ plugins: [react()], base: './' })
