# =============================================================================
# NeoGuide-Front — Dockerfile Multi-stage (Angular 18 + Nginx)
# =============================================================================

# Estágio 1: Build de produção da aplicação Angular
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Estágio 2: Servidor web Nginx servindo a SPA e proxy reverso para Back e NeoChat
FROM nginx:1.27-alpine

# Limpa a configuração padrão do Nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# Copia o template do Nginx (processado via envsubst no startup)
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copia os arquivos estáticos compilados do Angular (builder application -> dist/neoguide/browser)
COPY --from=build /app/dist/neoguide/browser /usr/share/nginx/html

# Restringe o envsubst apenas à variável LUMI_API_KEY para preservar $uri, $host, etc.
ENV NGINX_ENVSUBST_FILTER=^LUMI_API_KEY$

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
