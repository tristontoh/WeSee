FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY src/ src/
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# A .war, not a .jar — the pom declares war packaging so this can also be dropped into an
# external servlet container. spring-boot-maven-plugin repackages it, so java -jar still runs it
# with the embedded Tomcat.
#
# This line said *.jar until 2026-10-11, which matches nothing the build produces. That does not
# fail the build: BuildKit's COPY accepts a glob that matches no file and copies nothing, so the
# image built clean with an empty /app and died at startup with "Unable to access jarfile". A
# broken image that builds is worse than one that does not — it gets tagged, pushed and deployed
# before anything notices.
#
# The glob matches exactly one file: the plugin also leaves esg-backend-*.war.original beside it,
# which does not end in .war.
COPY --from=build /app/target/esg-backend-*.war app.war
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.war"]
