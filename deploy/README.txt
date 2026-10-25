Upload guide (see the project README, "Deploying to cPanel", for details)

public_html/  -> the website. On the server run scripts/deploy-frontend.sh, which copies it into
                 the web root, keeps the live config.js and .htaccess, and removes stale assets.
                 Manual upload: copy everything EXCEPT config.example.js over the web root; on a
                 first install, copy config.example.js to config.js and set the API URLs in it.
api/          -> upload to a folder OUTSIDE public_html (e.g. /home/<user>/shehraz-api) and
                 create a Node.js app there with startup file server.js.
                 Copy .env.example to .env and fill it in (NODE_ENV=production).
                 First time only: run the "seed" script to create services and the owner account,
                 then remove OWNER_PASSWORD from .env.

Built: 2026-10-25T11:15:47.155Z
