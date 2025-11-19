/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Advertencia: Esto ignora errores de ESLint durante el build
    // Solo para desarrollo - arreglar antes de producción
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora errores de TypeScript durante el build (temporal)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
