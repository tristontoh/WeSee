# The deployable image: the client and the API in one container, because the API serves the
# client itself from classpath:/static (see SpaResourceConfig).
#
# This replaces backend/Dockerfile, which built from the backend directory alone. That was wrong
# in a way nothing would have told you: backend/src/main/resources/static is gitignored but there
# was no .dockerignore, so the image picked up whatever client build happened to be sitting on
# the builder's disk — six weeks stale on the machine this was written on, and absent entirely
# from a clean clone, which would have served 404 on every page. The client is now built here.

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Empty base URL means the client calls /api/v1/... on its own origin. Left unset it defaults to
# http://localhost:8080 (api/client.ts), which works on a laptop and nowhere else.
ENV VITE_API_BASE_URL=""
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src/ src/
# After the backend sources, so the client build is what ends up being served rather than
# whatever was in the source tree.
RUN rm -rf src/main/resources/static
COPY --from=web /web/dist/ src/main/resources/static/
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# A .war, not a .jar — the pom declares war packaging so this can also be dropped into an
# external servlet container. spring-boot-maven-plugin repackages it, so java -jar still runs it
# with the embedded Tomcat. The glob matches one file: the plugin also leaves
# esg-backend-*.war.original beside it, which does not end in .war.
COPY --from=build /app/target/esg-backend-*.war app.war

# Evidence documents live here and must be a mounted volume. On the container filesystem they
# vanish on restart, and the audit trail then points at files that no longer exist.
RUN mkdir -p /data/uploads
ENV UPLOADS_DIR=/data/uploads

# Not root: a container escape should not start as the user that can rewrite the image.
RUN addgroup -S wesee && adduser -S wesee -G wesee && chown -R wesee:wesee /data
USER wesee

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=4 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.war"]
