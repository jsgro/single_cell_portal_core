# Dockerfile for SCP Image Pipeline
#
# PREREQUISITES
# Run the following command to register gcloud as a Docker credential helper:
# gcloud auth configure-docker

# TODO:
# ^ Put this in a Bash script

# Use a managed base image from Google.  It is continually updated for
# security fixes (thus the "latest" tag).
# https://github.com/GoogleContainerTools/base-images-docker/tree/master/ubuntu
FROM marketplace.gcr.io/google/ubuntu2004:latest

# RUN echo "Uncomment to clear cached layers below this statement (2020-01-07-0947)"

# Install Node
ENV NODE_VERSION=18.6.0
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version
RUN npm install -g yarn

# Copy contents of this directory into the Docker image
# (See .Dockerignore for omitted files)
COPY . image-pipeline

WORKDIR /image-pipeline

# Install JS dependencies
RUN yarn install

WORKDIR /image-pipeline
CMD ["node", "expression-scatter-plots", "--help"]
