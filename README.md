# Il Tuo Allenatore - MVP

Piattaforma web MVP per coach sportivi e atleti costruita con:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Autenticazione custom con ruoli (`COACH`, `ATHLETE`)

## Struttura progetto

```txt
src/
  app/
    (auth)/login
    coach/{dashboard,athletes,workouts,summary}
    athlete/{calendar,workouts/[id]}
    api/
      auth/{login,me}
      coach/{athletes,workouts,assignments,summary}
      athlete/{calendar,feedback}
  components/
    layout/
    ui/
  lib/
prisma/
  schema.prisma
  seed.ts
```

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

## Credenziali seed

- Coach: `coach@demo.it` / `coach123`
- Atleta: `anna@demo.it` / `athlete123`
- Atleta: `luca@demo.it` / `athlete123`

## MVP coperto

1. Login
2. Dashboard coach
3. Creazione atleta
4. Creazione allenamento
5. Assegnazione allenamento multipla (API)
6. Calendario settimanale atleta (API + pagina)
7. Dettaglio allenamento con blocchi
8. Feedback atleta post allenamento
9. Dashboard riepilogo coach (API + pagina)
