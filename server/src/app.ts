import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import { Pool } from 'pg'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'

const PgSession = connectPgSimple(session)

export function createApp() {
  const app = express()
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))
  app.use(express.json())
  app.use(
    session({
      store: new PgSession({ pool, createTableIfMissing: true }),
      name: 'financeflow.sid',
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  )
  app.use('/api', routes)
  app.use(errorHandler)

  return app
}
