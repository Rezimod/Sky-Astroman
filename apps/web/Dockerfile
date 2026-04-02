FROM node:20-bookworm-slim

WORKDIR /workspace

COPY . .

RUN npm ci
RUN npm run build -w @polymarket-bot/web

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@polymarket-bot/web"]
