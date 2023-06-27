# web-procycla
Web Procycla

## Environment config file (.env.local)
Example: https://pastebin.com/raw/DCGH8G0z
| Param | Description | Example |
| ------------- | ------------- | ------------- |
| NODE_ENV | Application Run Mode | development |
| NEXT_PUBLIC_API_URL | Web URL | https://procycla.com/ |
| NEXTAUTH_URL | Web URL | https://procycla.com/ |
| NEXTAUTH_SECRET | A secret string for generate tokens | example |
| BACK_API_URL | WEBAPI URL | https://api.procycla.com/ |
| STRIPE_PUBLIC_KEY | Stripe Public Key | example |
| BACK_API_AUTH_URL | Back Api Auth Url | https://procycla.com/ |

## Run
1. Install Node v16+
1. Clone repository
2. ``npm install``
3. Create configuration file (.env.local) in project root dir
4. ``npm run dev``

## Build
1. ``npm run build``
2. ``npm start``
