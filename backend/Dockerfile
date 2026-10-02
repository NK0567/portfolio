# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app

# openssl : requis par le moteur de requêtes Prisma sur Alpine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Exécution ----------
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

# node_modules complet, dev compris : la CLI Prisma (devDependency) est
# nécessaire au démarrage pour appliquer les migrations, et tsx pour le seed.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
RUN mkdir -p public/uploads && chown -R node:node /app

# Jamais root dans le conteneur : une faille dans une dépendance
# n'ouvrirait que les fichiers de l'application.
USER node

EXPOSE 8080

# Les migrations s'appliquent à chaque démarrage. `migrate deploy` n'applique
# que celles qui manquent et ne réinitialise jamais rien : c'est sans risque.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
