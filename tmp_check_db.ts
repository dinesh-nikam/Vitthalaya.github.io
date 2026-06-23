import { Database } from 'bun:sqlite';
const db = new Database('prisma/varkari.db');
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name:string}[];
console.log("Tables:", tables.map(t => t.name).join(', '));

try {
  const books = db.query("SELECT slug, title_marathi, book_type, status FROM book_publications").all();
  console.log("Books found:", JSON.stringify(books, null, 2));
} catch(e) {
  console.log("book_publications table error:", (e as Error).message);
}
