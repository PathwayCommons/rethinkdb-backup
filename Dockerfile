FROM node:17-stretch

############## General ##############
ARG VERSION_CODENAME=stretch
ARG APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=1

# Create an unprivileged user
RUN groupadd appuser \
  && useradd --gid appuser --shell /bin/bash --create-home appuser

RUN \
  apt-get update && \
  apt-get install -y wget python-pip

############## RethinkDB ##############
ARG RETHINKDB_VERSION=2.3.7~0stretch

RUN \
  echo "deb https://download.rethinkdb.com/repository/debian-$VERSION_CODENAME $VERSION_CODENAME main" \
    | tee /etc/apt/sources.list.d/rethinkdb.list && \
  wget -qO- https://download.rethinkdb.com/repository/raw/pubkey.gpg | apt-key add - && \
  apt-get update  && \
  apt-get install -y rethinkdb=$RETHINKDB_VERSION

# Install python driver for rethinkdb
RUN pip install rethinkdb==2.3.0

# Add the rethinkdb user to the appuser group
# RUN usermod -a -G appuser rethinkdb

############## Node App ##############
ARG NODE_ENV

# Initialize environment and override with build-time flag, if set
ENV NODE_ENV ${NODE_ENV:-production}

# Copy in source code
COPY . /home/appuser/app

WORKDIR /home/appuser/app

RUN npm install

# Change ownership to the unprivileged user
RUN chown appuser:appuser -R /home/appuser

USER appuser

CMD ["npm", "run", "start"]