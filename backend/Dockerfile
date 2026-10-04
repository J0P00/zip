FROM node:20-bookworm

# The evaluator needs javac, so this image deliberately installs a full JDK,
# not only a Java runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
