# 3Dshow

Digital ownership for physical collectible cards: tap a card's NFC tag, open
its page, claim its numbered digital twin — no wallet, no seed phrase, no gas.
Ownership is designed to anchor on an EVM chain (Base Sepolia for a live demo).

This is a from-scratch implementation built for a hackathon submission: a
minimal but complete claim flow (frontend + API + smart contract), written
against the product spec below rather than reusing any prior codebase.

## What this is

- An **issuer** mints numbered cards (`001/099`) to a collection.
- A **collector** opens a card's URL (what an NFC tag would carry), enters a
  name, and claims the card — no login, no wallet setup, no gas from them.
- The **API** is the only writer to the chain; it holds the issuer key and
  sponsors gas.
- The **contract** is deliberately thin: it only tracks token ownership and a
  per-token version pointer. Everything else (collections, history, statuses)
  lives in the database.

## Repository layout

```
src/           frontend — minimal placeholder UI (/, /card/:slug, /demo)
public/        placeholder card art (front.svg / back.svg)
server/        Express API + Prisma/SQLite + demo seed data
contract/      Hardhat project — CollectibleCard.sol (ERC-721) + scripts
```

## Run the demo (no chain, no login — 2 terminals)

Demo mode is the default and needs zero external services.

```bash
# one-time setup — backend
cd server
npm install
cp .env.example .env      # DEMO_MODE=true is already set
npx prisma db push
npm run seed

# terminal 1 — API
npm run dev                # http://localhost:3001

# terminal 2 — frontend
cd ..
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

Open `http://localhost:5173/demo` for the presenter panel (one-click reset),
or go straight to `http://localhost:5173/card/test-card` to try a claim.

## Run against a real chain (optional, 4 terminals)

```bash
cd contract
npm install
npm run node                                   # terminal 3 — local Hardhat node
npm run deploy:local                           # prints the deployed address
CONTRACT_ADDRESS=0x<deployed> npm run mint:local   # once per card
```

Then in `server/.env`:

```
DEMO_MODE=false
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x<deployed>
ISSUER_PRIVATE_KEY=<hardhat account #0 private key>
```

Restart the API. Claims now execute `claimTo` on the local ERC-721; the
issuer key pays gas.

## Deploy to Base Sepolia

```bash
cd contract
export BASE_SEPOLIA_PRIVATE_KEY=0x<throwaway-funded-key>
npx hardhat run script/deploy.js --network baseSepolia
CONTRACT_ADDRESS=0x<deployed> npx hardhat run script/mint.js --network baseSepolia
```

Then point `server/.env` at `RPC_URL=https://sepolia.base.org` with the same
`CONTRACT_ADDRESS`/`ISSUER_PRIVATE_KEY` and set `DEMO_MODE=false`. Every
claim becomes a real, verifiable Base Sepolia transaction while the collector
still just types a name and taps Claim.

## API reference (Express, port 3001)

All responses are JSON with an `ok` boolean.

| Method & path | Purpose |
|---|---|
| `GET /health` | liveness check |
| `GET /config` | `{ demoMode, contractAddress }` |
| `GET /collection/:slug` | cards in a collection |
| `GET /card/:slug` | card details; status derived from chain in real mode |
| `GET /card/:slug/history` | ownership event timeline |
| `POST /claim` | `{ cardSlug, userWallet, collectorName? }` → claims the card |
| `POST /demo/reset` | demo mode only — reseed the DB |
| `POST /demo/cards/:slug/status` | demo mode only — force a card's status |
| `GET /demo/state` | all collections/cards for the presenter panel |

## Data model (Prisma)

- **Collection** — `name, slug` · has many Cards.
- **Card** — the numbered identity. `slug` (public URL key), `tokenId` (chain
  link), `serialNumber`, `status` (`UNCLAIMED | CLAIMED | LOST | REPLACED`).
- **CardVersion** — one physical print of a Card (`ACTIVE | LOST | REPLACED |
  INVALID`); a replacement creates a new version, never a new Card, so
  history never breaks.
- **OwnershipHistory** — append-only event log (`mint | claim | transfer |
  lost_report | replacement`).
- **User** — collector identity, keyed by wallet address.

## Frontend

The current UI (`src/`) is intentionally minimal — a flip card, a claim
form, and a presenter panel — so the real presentation layer can be built on
top of the same API without backend changes. Swap in richer visuals
(3D viewer, real auth) in `src/pages/` and `src/components/` as needed.

## Status

**v0.1 — claim slice.** Issue → claim works end-to-end in both demo mode and
against a real chain. Not yet built: transfer, lost/replacement flow, issuer
dashboard, real NFC writing, real authentication.
