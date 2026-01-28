import { Sequelize, Options } from 'sequelize';
import { postgresql } from '../../../../config/database.config.js';

interface SequelizeConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  dialect: 'postgres';
  dialectOptions: {
    bigNumberStrings: boolean;
    ssl: {
      require: boolean;
      rejectUnauthorized: boolean;
    };
  };
}

const sequelizeOptions: Options = {
  host: postgresql.host,
  port: postgresql.port,
  dialect: 'postgres',
  logging: true,
  dialectOptions: {
    bigNumberStrings: true,
    ssl: {
      require: true,
      rejectUnauthorized: false   // مهم جدًا في Supabase عشان self-signed cert
    }
  },
  pool: {
    max: 200,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 3
  }
};

const sequelize = new Sequelize(
  postgresql.database, 
  postgresql.user, 
  postgresql.password, 
  sequelizeOptions
);

export const development: SequelizeConfig = {
  username: postgresql.user,
  password: postgresql.password,
  database: postgresql.database,
  host: postgresql.host,
  port: postgresql.port,
  dialect: 'postgres',
  dialectOptions: {
    bigNumberStrings: true,
    ssl: {
      require: true,
      rejectUnauthorized: false   // مهم جدًا في Supabase عشان self-signed cert
    }
  },
};

export const test: SequelizeConfig = {
  username: postgresql.user,
  password: postgresql.password,
  database: postgresql.database,
  host: postgresql.host,
  port: postgresql.port,
  dialect: 'postgres',
  dialectOptions: {
    bigNumberStrings: true,
    ssl: {
      require: true,
      rejectUnauthorized: false   // مهم جدًا في Supabase عشان self-signed cert
    }
  },
};

export const production: SequelizeConfig = {
  username: postgresql.user,
  password: postgresql.password,
  database: postgresql.database,
  host: postgresql.host,
  port: postgresql.port,
  dialect: 'postgres',
  dialectOptions: {
    bigNumberStrings: true,
    ssl: {
      require: true,
      rejectUnauthorized: false   // مهم جدًا في Supabase عشان self-signed cert
    }
  },
};

export default sequelize;
