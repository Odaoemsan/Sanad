import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* إعدادات التصدير الثابت لإنشاء مجلد out */
    output: 'export', 
      typescript: {
          ignoreBuildErrors: true,
            },
              eslint: {
                  ignoreDuringBuilds: true,
                    },
                      images: {
                          unoptimized: true, // ضروري جداً لتشغيل الصور داخل الـ APK
                              remotePatterns: [
                                    {
                                            protocol: 'https',
                                                    hostname: 'placeholder.co',
                                                            port: '',
                                                                    pathname: '/**',
                                                                          },
                                                                                {
                                                                                        protocol: 'https',
                                                                                                hostname: 'images.unsplash.com',
                                                                                                        port: '',
                                                                                                                pathname: '/**',
                                                                                                                      },
                                                                                                                            {
                                                                                                                                    protocol: 'https',
                                                                                                                                            hostname: 'picsum.photos',
                                                                                                                                                    port: '',
                                                                                                                                                            pathname: '/**',
                                                                                                                                                                  },
                                                                                                                                                                      ],
                                                                                                                                                                        },
                                                                                                                                                                        };

                                                                                                                                                                        export default nextConfig;
                                                                                                                                                                        