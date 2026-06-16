# ЭТАП 1: Собираем проект из исходников
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ЭТАП 2: Берем готовый результат и запускаем внутри веб-сервера Nginx
FROM nginx:alpine
# Забираем собранную папку dist из первого этапа и кладем в Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Подсовываем Nginx наш конфиг, который мы сделали в ПУНКТЕ 1
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]