# Automated Edge DCA Bot

## Overview
A serverless worker that executes Dollar Cost Averaging (DCA) purchases via an exchange's Advanced Trade API to avoid retail convenience fees.

## Current Track
**Track 1: Portfolio Piece** 

## Problem Statement
Retail crypto exchanges charge exorbitant fees for recurring "convenience" buys. Standard trading bots require spinning up a server/VPS which costs money and requires maintenance. This project solves both by running a DCA script for free on the edge.

## Tech Stack
- Cloudflare Workers (TypeScript, Cron Triggers)
- Web Crypto API for ECDSA JWT signing
- Resend API for email alerts

## Architecture
Cloudflare Worker triggered by a Cron schedule (e.g. every Friday). It authenticates with the exchange via dynamically signed JWTs, fetches the available USD balance, places market orders for configured assets, and emails the user via Resend if any step fails.

## Status
MVP - Ready for deployment.

## Key Decisions
- **Edge Computing**: Used Cloudflare Workers for zero-cost, serverless execution.
- **Web Crypto API**: Forced to use `crypto.subtle` because standard Node.js crypto libraries don't work in V8 isolates.
- **OpSec Abstraction**: Abstracted all exchange-specific names and URLs into environment variables to allow the repo to be open-sourced safely.
- **Cron Timing**: Set the execution to Friday late afternoon to ensure direct fiat deposits have fully cleared the bank settlement process.
