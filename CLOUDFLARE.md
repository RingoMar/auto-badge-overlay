# Cloudflare Worker Deploy

This project can run locally through `server.js`, or on Cloudflare Workers through `worker.js`.

## Local Node Proxy

```sh
npm start
```

Open the local URL printed by `server.js`.

## Cloudflare Dev

```sh
npm run dev
```

The `predev` script syncs `index.html` and `badge-game.js` into `public/` before Wrangler starts.

## Cloudflare Deploy

```sh
npx wrangler login
npm run deploy
```

Wrangler uploads only the files in `public/` as static assets. The Worker handles `/events` and `/twitch-gql`.
