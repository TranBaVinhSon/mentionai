// yarn migration:<cmd> uses this file, so make sure env variables are set
import "dotenv/config";
import { DataSource } from "typeorm";


const gengarDBHostname = process.env.GENGAR_DB_HOSTNAME;
const gengarDBUsername = process.env.GENGAR_DB_USERNAME;
const gengarDBPassword = process.env.GENGAR_DB_PASSWORD;
const gengarDBName = process.env.GENGAR_DB_NAME;
const gengarDBPort = process.env.GENGAR_DB_PORT;
const loggingEnabled = process.env.DATABASE_LOGGING === "true";

const gengarDataSource = new DataSource({
  migrationsTableName: "migrations",
  name: "default",
  type: "postgres",
  host: gengarDBHostname,
  port: Number(gengarDBPort),
  username: gengarDBUsername,
  password: gengarDBPassword,
  database: gengarDBName,
  logging: true,
  synchronize: false,
  entities: ["dist/src/db/entities/*.js"], // Updated path
  migrations: ["dist/src/db/migrations/*.js"], // Updated path
});

// Initialize the connection immediately
gengarDataSource
  .initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });

export default gengarDataSource;
