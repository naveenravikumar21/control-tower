import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// REPLACE 'repo-name' WITH THE NAME OF YOUR GITHUB REPOSITORY
export default defineConfig({
  plugins: [react()],
  base: '/control-tower/', 
})