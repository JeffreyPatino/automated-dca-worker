# Automated Edge DCA Bot

A fully autonomous, zero-maintenance Dollar Cost Averaging (DCA) bot built for the edge. 

This project was built to bypass the notoriously high retail fees associated with automated crypto purchases on consumer-facing exchanges. By interfacing directly with an exchange's Advanced Trade REST APIs, this bot executes recurring market orders at rock-bottom maker/taker fees, running completely free on Cloudflare Workers.

## Why I Built This

I wanted a set-it-and-forget-it DCA strategy, but the "convenience fees" on retail platforms for small, weekly recurring buys quickly eat into principal investments. Furthermore, I wanted a solution that didn't require me to spin up a VPS, manage a Docker container, or leave a script running 24/7 on a home server.

**The Goal:** Build a fully serverless, highly secure, zero-cost pipeline.

## Technical Architecture & Learnings

### 1. Edge Computing & The Web Crypto API
Traditional Node.js trading bots rely heavily on the built-in `crypto` module. Moving this logic to a V8 isolate (Cloudflare Workers) meant I had to adapt to a different runtime environment.
- **Learning:** I couldn't use standard npm crypto packages. Instead, I learned how to use the browser-native `crypto.subtle` (Web Crypto API) to manually construct, encode, and sign ECDSA P-256 JSON Web Tokens (JWTs) entirely from scratch. This was a deep dive into cryptographic primitives and JWT anatomy.

### 2. Operational Security (OpSec) & Abstraction
When open-sourcing a financial tool, it is important to practice good OpSec. You don't want to broadcast which specific exchanges you hold funds on or what your exact portfolio looks like.
- **Learning:** I architected the bot to be exchange-agnostic on the surface. The codebase uses generic terminology, and all domain-specific URLs, API endpoints, and payload claims are dynamically injected via Cloudflare Secrets. The bot's identity is completely decoupled from the repository.

### 3. Zero-Trust Secrets Management
Private keys and API credentials never touch this repository. 
- During local development, secrets are managed via `wrangler`'s `.dev.vars`.
- In production, they are stored securely in Cloudflare's encrypted Secrets vault.

### 4. Resilient Alerting
If a scheduled execution fails—whether due to insufficient fiat balance, exchange API downtime, or rate limiting—the bot catches the exception and immediately fires off an email alert via the **Resend API**.

## Tech Stack
- **Compute:** Cloudflare Workers (TypeScript, Cron Triggers)
- **Cryptography:** Web Crypto API (`crypto.subtle`)
- **Alerting:** Resend API

## Setup & Deployment

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.dev.vars.example` to `.dev.vars` and inject your Exchange API credentials, Resend API key, and preferred DCA amounts.
3. Test locally using the development server:
   ```bash
   npm run dev
   ```
4. Deploy to Cloudflare Workers:
   ```bash
   npm run deploy
   ```
