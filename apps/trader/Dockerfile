FROM node:20-bookworm-slim

WORKDIR /workspace

COPY . .

RUN npm ci
RUN npm run build -w @polymarket-bot/trader

ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "run", "start", "-w", "@polymarket-bot/trader"]
