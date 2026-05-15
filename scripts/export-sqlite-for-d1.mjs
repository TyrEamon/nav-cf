import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

const source = process.argv[2] || path.join("database", "nav.db");
const output = process.argv[3] || path.join("web", "d1-data.sql");

const tables = [
  ["menus", ["id", "name", "order"]],
  [
    "sub_menus",
    ["id", "parent_id", "name", "order"],
    "WHERE EXISTS (SELECT 1 FROM menus m WHERE m.id = sub_menus.parent_id)",
  ],
  [
    "cards",
    ["id", "menu_id", "sub_menu_id", "title", "url", "logo_url", "custom_logo_path", "desc", "order"],
    "WHERE (menu_id IS NULL OR EXISTS (SELECT 1 FROM menus m WHERE m.id = cards.menu_id)) AND (sub_menu_id IS NULL OR EXISTS (SELECT 1 FROM sub_menus s WHERE s.id = cards.sub_menu_id))",
  ],
  ["users", ["id", "username", "password", "last_login_time", "last_login_ip"]],
  ["ads", ["id", "position", "img", "url"]],
  ["friends", ["id", "title", "url", "logo"]],
];

if (!fs.existsSync(source)) {
  console.error(`SQLite database not found: ${source}`);
  process.exit(1);
}

const db = new sqlite3.Database(source);

try {
  const lines = [];

  for (const [table, wantedColumns, where = ""] of tables) {
    const existingColumns = await getColumns(db, table);
    if (!existingColumns.length) continue;

    const columns = wantedColumns.filter((column) => existingColumns.includes(column));
    if (!columns.length) continue;

    const rows = await all(
      db,
      `SELECT ${columns.map(quoteIdent).join(", ")} FROM ${quoteIdent(table)} ${where}`,
    );
    for (const row of rows) {
      lines.push(
        `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES (${columns
          .map((column) => sqlValue(row[column]))
          .join(", ")});`,
      );
    }
  }

  lines.push("");

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, lines.join("\n"), "utf8");
  console.log(`Exported D1 import SQL: ${output}`);
} finally {
  db.close();
}

function getColumns(db, table) {
  return all(db, `PRAGMA table_info(${quoteIdent(table)})`).then((rows) => rows.map((row) => row.name));
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return String(value);
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}
