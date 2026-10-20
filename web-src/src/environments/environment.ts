import { isDevMode } from '@angular/core';

// Адрес API. При ng serve фронтенд на :4200, API — на :5000 (свой порт: api/Properties/launchSettings.json
// или параметр --urls у dotnet run). На сервере фронтенд и API отдаются с одного адреса — префикс пустой,
// запросы идут на /api/... Больше нигде в коде адрес API не пишется.
export const environment = {
  apiUrl: isDevMode() ? 'http://localhost:5000' : '',
};
