Upload guide (see the project README, "Deploying to cPanel", for details)

public_html/  -> upload the CONTENTS into your domain's web root (usually public_html).
                 Keep .htaccess (hidden file). Edit config.js if the API is on another domain.
api/          -> upload to a folder OUTSIDE public_html (e.g. /home/<user>/shehraz-api) and
                 create a Node.js app there with startup file server.js.
                 Copy .env.example to .env and fill it in (NODE_ENV=production).
                 First time only: run the "seed" script to create services and the owner account,
                 then remove OWNER_PASSWORD from .env.

Built: 2026-10-24T12:49:47.858Z
