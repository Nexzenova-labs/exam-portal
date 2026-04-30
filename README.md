# 📝 Exam Portal

A full-stack online examination platform built with **Next.js 16**, **Prisma ORM**, and **Supabase PostgreSQL**. It enables institutions to create and manage exams, register students via email/OTP verification, and conduct auto-graded assessments with result delivery.

---

## 🚀 What This Project Does

| Feature | Description |
|---|---|
| **Admin Panel** | Create and manage exams, upload question banks (Excel/CSV), view registrations and scores |
| **Student Registration** | Students register via a unique exam link — email + phone OTP verification required |
| **Secure Exam Links** | One-time tokenised exam links with configurable attempt limits |
| **Auto-grading** | MCQ answers are auto-scored and results emailed to students immediately |
| **OTP Verification** | Email OTP via SMTP; optional SMS OTP via Twilio |
| **QR Code Access** | QR codes generated per exam for easy student onboarding |
| **Question Shuffling** | Questions and answer options are shuffled per session to prevent copying |

---

## 🛠️ Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Database** — [Supabase](https://supabase.com/) (PostgreSQL)
- **ORM** — [Prisma 7](https://www.prisma.io/)
- **Auth** — JWT-based session tokens (`jsonwebtoken`)
- **Email** — Nodemailer (SMTP — works with Gmail, Hostinger, etc.)
- **SMS** — Twilio (optional)
- **Styling** — Tailwind CSS v4
- **Language** — TypeScript

---

## 📁 Project Structure

```
exam-portal/
├── prisma/
│   ├── schema.prisma        # Database models (Exam, Registration, OTP, Session, Submission, Admin)
│   └── migrations/          # SQL migration history
├── src/
│   ├── app/
│   │   ├── page.tsx         # Landing page → Admin Login / Student instructions
│   │   ├── admin/           # Admin login & dashboard (create exams, view results)
│   │   │   └── dashboard/   # Per-exam management (registrations, grant attempts, send links)
│   │   ├── exam/[token]/    # Student exam interface (OTP gate → questions → submit)
│   │   ├── register/        # Student registration flow
│   │   └── api/             # REST API routes
│   │       ├── admin/       # login, exam CRUD, file upload, grant-attempt
│   │       ├── exam/        # start session, submit answers
│   │       ├── otp/         # send & verify OTP (email + SMS)
│   │       └── register/    # student registration
│   └── lib/
│       ├── db.ts            # Prisma client singleton
│       ├── auth.ts          # JWT helpers
│       ├── email.ts         # Nodemailer — OTP, exam link, result emails
│       ├── sms.ts           # Twilio SMS helper
│       ├── otp.ts           # OTP generation & verification logic
│       ├── parser.ts        # Excel/CSV question bank parser
│       └── shuffle.ts       # Fisher-Yates shuffle for questions/options
├── .env.example             # Environment variable template
├── next.config.ts
├── prisma.config.ts
└── package.json
```

---

## ⚙️ Setup & Installation

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **Supabase** project (free tier works)
- An SMTP email account (Gmail App Password recommended)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Nexzenova-labs/exam-portal.git
cd exam-portal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set the following:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Your Supabase PostgreSQL connection string |
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | Usually `465` (SSL) or `587` (TLS) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `SMTP_USER` | Your email address |
| `SMTP_PASS` | App password (not your login password!) |
| `SMTP_FROM` | Sender display name + email |
| `TWILIO_ACCOUNT_SID` | *(optional)* Twilio SID for SMS OTP |
| `TWILIO_AUTH_TOKEN` | *(optional)* Twilio auth token |
| `TWILIO_PHONE_NUMBER` | *(optional)* Twilio phone number |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; your domain in production |
| `ADMIN_EMAIL` | Email for the first admin account |
| `ADMIN_PASSWORD` | Password for the first admin account |
| `JWT_SECRET` | Random 32-byte hex string — run `openssl rand -hex 32` |

> **Getting your Supabase `DATABASE_URL`:**
> Go to [supabase.com](https://supabase.com) → Your Project → **Settings → Database → Connection String → URI**

> **Gmail App Password:**
> Google Account → Security → 2-Step Verification → App Passwords → Generate one for "Mail"

### 4. Run Database Migrations

```bash
npx prisma migrate deploy
```

> This applies all migrations in `prisma/migrations/` to your Supabase database.

### 5. Seed the Admin Account

```bash
npx prisma db seed
```

> Or navigate to `http://localhost:3000/admin` — the first admin is created automatically from your `ADMIN_EMAIL` / `ADMIN_PASSWORD` env values on first login.

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👤 How to Use

### Admin Workflow

1. Go to `http://localhost:3000/admin` and log in with your admin credentials.
2. Click **"Create New Exam"** — provide a title, description, and total marks.
3. **Upload a question bank** as Excel (`.xlsx`) or CSV with columns: `question`, `optionA`, `optionB`, `optionC`, `optionD`, `answer`.
4. The exam dashboard shows a **QR code** and a **registration link** — share either with students.
5. Once students register and verify their email, click **"Send Exam Links"** from the dashboard.
6. View all submissions, scores, and percentages in the registrations table.
7. Use **"Grant Attempt"** to give a student an extra attempt if needed.

### Student Workflow

1. Student receives/scans the registration link or QR code.
2. Fills in name, branch, section, email, phone.
3. Verifies email via OTP.
4. Admin sends the unique exam link to the student's email.
5. Student opens the link, verifies identity, and begins the exam.
6. On submission, results are auto-calculated and emailed immediately.

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server at `http://localhost:3000` |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |
| `npx prisma migrate deploy` | Apply migrations to the database |
| `npx prisma studio` | Open Prisma Studio GUI to browse your database |
| `npx prisma generate` | Regenerate the Prisma client after schema changes |

---

## 🗄️ Database Schema Overview

```
Exam ──< Registration ──< ExamSession
                     ──< Submission
                     ──< OTP
Admin (standalone — no relation to students)
```

- **Exam** — stores question bank (JSON), answers, and settings
- **Registration** — one record per student per exam; tracks OTP and attempt state
- **OTP** — time-limited codes for email/phone verification
- **ExamSession** — tracks start/end time and session token
- **Submission** — stores student answers, score, and result delivery status
- **Admin** — bcrypt-hashed admin credentials

---

## 🔒 Security Notes

- `.env` is **never committed** — only `.env.example` is tracked.
- Admin passwords are hashed with **bcryptjs**.
- Exam session tokens are **single-use JWT** tokens with expiry.
- Students are limited to `maxAttempts` (default: 2) per registration.

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub (already done ✅)
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Deploy — Vercel auto-runs `next build`

### Other Platforms

Any platform supporting Node.js 18+:
- Set all env variables
- Run `npm install && npx prisma migrate deploy && npm run build && npm run start`

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT © [Nexzenova Labs](https://github.com/Nexzenova-labs)
