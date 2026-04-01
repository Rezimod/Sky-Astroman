FROM node:20-bookworm-slim

WORKDIR /workspace

COPY package.json package.json
COPY tsconfig.base.json tsconfig.base.json
COPY .prettierrc.json .prettierrc.json
COPY eslint.config.mjs eslint.config.mjs
COPY apps/web/package.json apps/web/package.json
COPY apps/trader/package.json apps/trader/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/polymarket-adapter/package.json packages/polymarket-adapter/package.json
COPY packages/backtest-core/package.json packages/backtest-core/package.json

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev", "-w", "@polymarket-bot/trader"]

