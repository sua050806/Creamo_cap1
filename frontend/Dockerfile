FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# NEXT_PUBLIC_* 값은 컨테이너 실행 시점(environment:)이 아니라 `npm run build` 시점에 결과물에
# 그대로 박힌다 — docker-compose.yml의 environment:만으로는 반영이 안 되고, 반드시 build.args로
# 빌드 시점에 넘겨줘야 한다 → ADR-040 참고.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_PORTONE_STORE_ID
ARG NEXT_PUBLIC_PORTONE_CHANNEL_KEY
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_PORTONE_STORE_ID=$NEXT_PUBLIC_PORTONE_STORE_ID
ENV NEXT_PUBLIC_PORTONE_CHANNEL_KEY=$NEXT_PUBLIC_PORTONE_CHANNEL_KEY

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
