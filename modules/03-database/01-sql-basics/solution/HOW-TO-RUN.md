# How to run — 01-sql-basics (SQL)

Requires **PostgreSQL** with the `psql` client on your PATH.

## Windows (PowerShell)
```powershell
cd modules\03-database$d\solution
# create/seed the database (first file in this folder)
psql -U postgres -f setup.sql        # 01-sql-basics
# or: psql -U postgres -d sooqonline -f schema.sql   # 02-schema-joins-dashboard
# then run the query file:
psql -U postgres -d sooqonline -f queries.sql        # or dashboard.sql
```

## macOS / Linux (Terminal)
```bash
cd modules/03-database/01-sql-basics/solution
psql -U postgres -f setup.sql        # 01-sql-basics
# or: psql -U postgres -d sooqonline -f schema.sql   # 02-schema-joins-dashboard
psql -U postgres -d sooqonline -f queries.sql        # or dashboard.sql
```

To explore interactively: `psql -U postgres -d sooqonline` then paste queries.
