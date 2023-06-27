# web-procycla-api
Web Procycla Api

## Environment config file (.env)
Example: https://pastebin.com/raw/MF4mhmBj
| Param | Description | Example |
| ------------- | ------------- | ------------- |
| DEV | Dev Mode, set to true for create admin accounts | true |
| APP_PORT | Application Running Port | 3000 |
| APP_URL | Application Running URL | http://137.184.117.201:3010 |
| ACCESS_TOKEN_SECRET | Access Token Secret | 1234567890 |
| ACCESS_TOKEN_EXPIRES_IN | Access Token Expiration Time | 30d |
| DB_NAME | MySQL Database Name | procycla |
| DB_USER | MySQL Database User | procycla |
| DB_PASS | MySQL Database Password | procycla |
| DB_HOST | MySQL Database Host | localhost |
| DB_PORT | MySQL Database Port | 3306 |
| DB_FORCE_SYNC | Force Sync Database | false (when true all tables will be recreated LOSING DATA!) |
| DB_FORCE_ALTER | Force Alter Database | false (when true all tables will be altered with new changes NO DATA LOSING) |
| SALT_ROUNDS | Salt Rounds For Bcrypt User Password | 10 |
| DATE_FORMAT | Date Format | DD/MM/YYYY h:mm:ss |
| STRIPE_SECRET_KEY | Stripe Secret Key | sk_test_51Miy0REQvbL9og7peD2aEjLZ96FEaWFjgDgLZoFitDIpcXi1UPkpkm6UlBdGluH1RC1uTCOHE6zsL3JueZfBQpRo00m6acVkBE |
| FILES_PATH | Simulations Input Files Path | files |
| WRANGLING_API_URL | Wrangling API URL | http://137.184.117.201:8042 |
| BMP_API_URL | BMP API URL | http://137.184.117.201:8069 |
| CSTR_API_URL | CSTR API URL | http://137.184.117.201:8070 |
| MAIL_HOST | Mail Host (for user 2FA) | smtp.ethereal.email |
| MAIL_PORT | Mail Port | 587 |
| MAIL_USER | Mail User | roselyn.lueilwitz60@ethereal.email |
| MAIL_PASS | Mail Password | xgGSpd8Cr8TPxgWrpz |

## Execute
1. Install Node v16+
1. Clone repository
2. ``npm install``
3. Create configuration file (.env) in project root dir
4. ``node app.js``
