const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    BACK_API_URL: process.env.BACK_API_URL,
    STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY
  }
}

module.exports = nextConfig
