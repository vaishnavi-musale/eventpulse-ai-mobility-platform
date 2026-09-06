// §35 — TypeORM data-source config for CLI migrations + runtime
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { join } from "path";

export function buildDataSourceOptions(
  env: NodeJS.ProcessEnv,
): DataSourceOptions {
  return {
    type: "postgres",
    host: env.POSTGRES_HOST ?? "localhost",
    port: Number(env.POSTGRES_PORT ?? 5432),
    username: env.POSTGRES_USER ?? "eventpulse",
    password: env.POSTGRES_PASSWORD ?? "eventpulse_dev",
    database: env.POSTGRES_DB ?? "eventpulse",
    entities: [
      join(__dirname, "..", "core", "**", "entities", "*.entity.{ts,js}"),
    ],
    migrations: [join(__dirname, "..", "migrations", "*.{ts,js}")],
    synchronize: env.NODE_ENV !== "production",
    logging: env.NODE_ENV === "development",
  };
}

export default new DataSource(buildDataSourceOptions(process.env));
