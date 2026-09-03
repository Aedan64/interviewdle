import { sql } from "@vercel/postgres";

function postgresStatement(statement: string) {
  let parameter = 0;
  return statement.replace(/\?/g, () => `$${++parameter}`);
}

export function getDatabase() {
  return {
    prepare(statement: string) {
      return {
        bind(...values: unknown[]) {
          const query = postgresStatement(statement);
          return {
            first() {
              return sql.query(query, values).then((result) => result.rows[0] ?? null);
            },
            all() {
              return sql.query(query, values).then((result) => ({ results: result.rows }));
            },
            run() {
              return sql.query(query, values);
            },
          };
        },
      };
    },
  };
}