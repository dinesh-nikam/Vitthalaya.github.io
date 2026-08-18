# Database Workflow Guide (Varkari)

Since your project uses Vercel for deployment, Neon for PostgreSQL hosting, and a custom migration workflow, here is the complete, detailed guide on how to safely make and deploy database changes.

> [!WARNING]
> Do **NOT** use `prisma migrate dev` in this project. The project is explicitly designed to bypass the traditional Prisma migration history table in favor of `prisma db push` and flat idempotent SQL files.

---

## 1. Local Development: Changing the Schema

When you need to add a new table, column, or relation:

1. Open `prisma/schema.prisma` and make your changes.
2. Ensure your `.env` file points to your local database (or Neon, if you're developing directly against it).
3. Run the following command to sync the changes to your database and regenerate the Prisma Client:
   ```bash
   bunx prisma db push
   ```
4. If you have custom SQL (e.g., `pgvector` indexes or raw SQL views) that Prisma does not support, you must add it as a new `.sql` file in the `prisma/migrations/` folder. Ensure the SQL uses `IF NOT EXISTS` guards so it is idempotent.

## 2. Pushing to Vercel (Production)

Because of the custom setup in your `package.json`, Vercel handles the deployment automatically. You do not need to run manual migration commands on Vercel.

When Vercel builds your project, it runs the `build` script defined in your `package.json`:

```json
"build": "bun scripts/switch-provider.ts && prisma generate && prisma db push --accept-data-loss && bun run db:seed && next build"
```

### What Vercel does during this step:
1. **`switch-provider.ts`**: Ensures the Prisma schema is using the correct provider (Postgres).
2. **`prisma generate`**: Generates the Prisma Client so your code can access the new fields.
3. **`prisma db push --accept-data-loss`**: Pushes your Prisma schema changes directly to Neon. (The `--accept-data-loss` flag is required by Vercel for non-interactive environments if a column is dropped).
4. **`bun run db:seed`**: This is critical. Before seeding data, this script automatically runs `bun run scripts/apply-sql-migrations.ts`, which loops through `prisma/migrations/*.sql` and executes every raw SQL file against Neon to ensure indexes and non-Prisma tables are up to date.

> [!NOTE]
> All you have to do is push your modified `prisma/schema.prisma` (and any new `.sql` files) to GitHub. Vercel will automatically apply them to your Neon database during the build!

## 3. Handling Raw SQL Migrations

If you need to add database features Prisma does not support natively (like full-text search indexes or `pgvector` extensions):

1. Create a new file in `prisma/migrations/`, e.g., `01_add_vector_extension.sql`.
2. Write raw, **idempotent** SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. To test this locally, run:
   ```bash
   bun run db:sqlmigrate
   ```
4. Commit the file. Vercel will automatically run it on the next deployment via the `db:seed` hook.

## 4. Recovering from Desyncs

If your Neon database and Prisma client ever get out of sync, or you see the error `Model 'X' does not exist on active client`:

1. Run `bunx prisma generate`
2. Run `bunx prisma db push`
3. Run `bun run db:sqlmigrate`

This 3-step combo guarantees your database and code are perfectly aligned.
