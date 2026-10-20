# ---------- 1. Сборка Angular ----------
FROM node:22-slim AS web
ENV NG_CLI_ANALYTICS=false CI=true
WORKDIR /build
RUN npm install -g @angular/cli
RUN ng new web --style=css --ssr=false --routing=false --skip-git --skip-tests --defaults
RUN rm -rf web/src/app
COPY web-src/src/ web/src/
WORKDIR /build/web
RUN npm run build

# ---------- 2. Сборка .NET ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY api/ api/
COPY --from=web /build/web/dist/web/browser/ api/wwwroot/
RUN dotnet publish api/ListingsApi.csproj -c Release -o /app

# ---------- 3. Итоговый образ ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app .
RUN mkdir -p /app/App_Data && chown -R $APP_UID /app/App_Data
USER $APP_UID
ENV ASPNETCORE_ENVIRONMENT=Production
# Render передаёт порт в переменной PORT (по умолчанию 10000)
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-10000} exec dotnet ListingsApi.dll"]
