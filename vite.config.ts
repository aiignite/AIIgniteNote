import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Type declarations for Vite environment variables
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly VITE_API_URL?: string;
  readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3210,
        host: '0.0.0.0',
      },
      // Tailwind CSS 插件必须放在其他插件之前
      plugins: [tailwindcss(), react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // 禁用代码分割，确保所有依赖都打包到本地
        rollupOptions: {
          output: {
            // 不分割代码，所有依赖都打包进主 bundle
            // manualChunks: {
            //   'react-markdown': ['@uiw/react-md-editor', 'react-markdown'],
            // }
          }
        },
        // 禁止把某些依赖外置到 CDN，强制全部打包
        commonjsOptions: {
          include: /node_modules/
        }
      }
    };
});
