FROM node:20-slim as build

# Create app directory
ENV APP_PATH /gengar
WORKDIR $APP_PATH

# Bundle app source
COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn install --force

# install packages
COPY . ./

# build ts -> js
RUN yarn build

FROM node:20-slim

# timezone set
ENV TZ Asia/Tokyo

# Create app directory
ENV APP_PATH /gengar
WORKDIR $APP_PATH

# Bundle app source
COPY ./package.json ./
COPY ./yarn.lock ./
RUN yarn install --production

COPY . ./
COPY --from=build /gengar/dist ./dist


ENV NODE_ENV=production

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD [ "yarn", "start:prod"]