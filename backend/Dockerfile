FROM eclipse-temurin:17-jdk

# Keep Node and the full JDK in the same production image. The evaluator
# requires both java and javac; fail the image build if either is absent.
RUN java -version && javac -version \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
