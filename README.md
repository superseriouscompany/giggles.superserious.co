# Giggles Backend

Requirements:

1. node

Installation:

    $ npm install

Running in development:

    $ npm run dev

Serving development server to development client (after `brew install ngrok`):

    $ ngrok http -subdomain=superserious 3000

Testing:

    $ npm test

Production Deployment:

    $ git remote add aws ssh://git@giggles.superserious.co:/giggles.superserious.co.git
    $ git push origin aws

Production Restart:

    $ ./systemctl restart
