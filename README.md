# EPMS — Exam Paper Management System

A full-stack web application for managing exam questions, building reusable exam templates, and generating professionally formatted `.docx` exam papers with one click.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Project Structure](#project-structure)

---

## Overview

EPMS is built around three ideas:

1. **Question Bank** — Store and organise questions by subject, topic, type, and difficulty. Questions support rich text formatting via XML tags (`<b>`, `<i>`, `<var>`, `<code>`) and optional embedded images.

2. **Exam Templates** — Define the structure of an exam (sections, number of questions per section, question types, topic coverage, difficulty distribution) without committing to specific questions upfront.

3. **Paper Generation** — With one click, the system randomly selects questions that match the template's criteria, balances the answer-key distribution, assembles the paper, and downloads a formatted `.docx` file — ready to print.

---

## Architecture

```
┌─────────────────────┐         ┌───────────────────────────┐
│   Angular Frontend  │ ──────▶ │   Spring Boot Backend     │
│   (port 4200)       │ ◀────── │   (port 8080)             │
└─────────────────────┘         │                           │
                                │  • REST API + JWT auth    │
                                │  • Question / template    │
                                │    management             │
                                │  • Question selection &   │
                                │    answer balancing       │
                                │  • Exam history storage   │
                                └────────────┬──────────────┘
                                             │ HTTP POST /generate
                                             ▼
                                ┌───────────────────────────┐
                                │   Paper Generator         │
                                │   Node.js microservice    │
                                │   (port 3001)             │
                                │                           │
                                │  • Renders .docx via      │
                                │    docx library           │
                                │  • Times New Roman,       │
                                │    proportional layout    │
                                │  • XML tag formatting     │
                                │  • Image embedding        │
                                └───────────────────────────┘
                                             │
                                        MySQL Database
                                        (port 3306)
```

The frontend never talks to the paper generator directly — all traffic flows through the backend, which handles authentication, question selection, and history recording before forwarding to the generator.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21, PrimeNG 21, TailwindCSS 4, TypeScript 5 |
| Backend | Java 17, Spring Boot 3.5, Spring Security (JWT), Spring Data JPA |
| Database | MySQL 8 |
| Paper Generator | Node.js, Express 5, docx 9, image-size 2, TypeScript |
| Auth | JWT (jjwt 0.13), BCrypt |
| API Docs | SpringDoc OpenAPI (Swagger UI) |

---

## Features

### Question Bank
- Create, edit, and delete questions across five types:
  - Multiple Choice (single correct answer)
  - Multiple Choice (multiple correct answers)
  - True / False
  - Gap Filling
  - Short Answer
- Assign questions to a **subject → topic** hierarchy
- Set difficulty: `BEGINNER`, `EASY`, `INTERMEDIATE`, `ADVANCED`
- Format question text and choices with inline XML tags: `<b>`, `<i>`, `<var>`, `<code>`
- Attach an image to any question (PNG / JPG)
- Filter questions by subject, topic, difficulty, type, and free-text search

### Exam Templates
- Define reusable exam structures with named sections (parts)
- Per section: set the number of questions, restrict to a question type, select topic coverage
- Optional difficulty distribution: e.g. 30% Beginner, 50% Intermediate, 20% Advanced
- Templates are scoped to a subject

### Exam Generation
- One-click `.docx` download from any template
- Backend randomly selects questions that satisfy all per-section constraints
- Answer-key distribution is balanced automatically across the paper
- Choice order is shuffled on each generation (MCQ questions)
- Full generation history saved per user for re-download

### Formatted Output (`.docx`)
- Times New Roman throughout; proportional glyph-width layout
- Glyph widths sourced from `Times New Roman.ttf` via `opentype.js` — 2 790+ characters covering full Latin, Vietnamese, and most BMP scripts; falls back to a built-in ASCII table if the data file is missing
- Question header bold 12 pt, question text 12 pt, choices 11 pt
- Short choices rendered on one line (4 columns); long choices on separate lines
- XML formatting faithfully rendered: bold, italic, monospace (var/code)
- Embedded images (JPEG / PNG) detected and sized via the `image-size` library; scaled to fit the page
- Each question is guaranteed to stay on a single page (no cross-page splits)
- Short Answer / Gap Filling questions include ruled answer lines

### Exam History
- Every generated paper is stored with its full question snapshot
- Re-download any past paper as a `.docx` at any time
- Delete history entries you no longer need

### User Accounts
- JWT-based authentication (register / login)
- Personal profile (first name, last name)
- All data is scoped to the authenticated user

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Java JDK | 17 |
| Maven | 3.9 |
| Node.js | 18 |
| npm | 9 |
| MySQL | 8 |
| Angular CLI | 21 (`npm i -g @angular/cli`) |

---

## Getting Started

### 1. Database

Create a MySQL database:

```sql
CREATE DATABASE epms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The backend uses `spring.jpa.hibernate.ddl-auto=update`, so all tables are created automatically on first start.

### 2. Backend

```bash
cd EPMS-backend
# Edit src/main/resources/application.properties if your MySQL credentials differ
mvn spring-boot:run
```

The API will be available at `http://localhost:8080`.  
Swagger UI: `http://localhost:8080/swagger-ui.html`

### 3. Paper Generator

```bash
cd EPMS-paper-generator
npm install
npm run build:widths   # generate data/times-roman-widths.json from Times-Roman.afm (run once)
npm run dev            # development (nodemon + ts-node)
# or
npm run build && npm start   # production
```

The service will be available at `http://localhost:3001`.  
Health check: `GET http://localhost:3001/health`

> `data/times-roman-widths.json` is committed to the repo, so `build:widths` is optional for most contributors — only re-run it if you update the font source.
>
> `Times New Roman.ttf` is **not** committed (it is gitignored) as it is a proprietary font. If you need to regenerate the JSON, place `Times New Roman.ttf` at the repo root and run `npm run build:widths`. The script scans the full Basic Multilingual Plane and writes widths for every glyph the font supports (typically 2 790+ characters, including full Vietnamese).

### 4. Frontend

```bash
cd EPMS-frontend
npm install
ng serve
```

Open `http://localhost:4200` in your browser.

### Start Order

```
MySQL  →  Backend  →  Paper Generator  →  Frontend
```

The backend and paper generator are independent of each other at startup; only the backend needs the database and only the backend calls the paper generator at request time.

---

## Configuration

### Backend — `application.properties`

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/epms?serverTimezone=Asia/Ho_Chi_Minh
spring.datasource.username=root
spring.datasource.password=root

# Paper generator microservice
paper.generator.url=http://localhost:3001

# JWT secret (change in production)
jwt.secret=<your-secret>
jwt.expiration=86400000
```

### Paper Generator — environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the service listens on |

---

## API Reference

All endpoints except `/api/auth/**` require an `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new account |
| `POST` | `/api/auth/login` | Log in, receive JWT |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/profile` | Update first / last name |

**Login request:**
```json
{ "email": "user@example.com", "password": "secret" }
```
**Login response:**
```json
{ "token": "eyJ...", "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "USER" } }
```

### Subjects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/subjects?page=0&size=10` | Paginated list |
| `GET` | `/api/subjects/{id}` | Single subject |
| `POST` | `/api/subjects` | Create |
| `PUT` | `/api/subjects/{id}` | Update |
| `DELETE` | `/api/subjects/{id}` | Delete |

### Topics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/topics/subject/{subjectId}` | All topics for a subject |
| `POST` | `/api/topics` | Create |
| `PUT` | `/api/topics/{id}` | Update |
| `DELETE` | `/api/topics/{id}` | Delete |

### Questions

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/questions` | Paginated list with filters |
| `GET` | `/api/questions/{id}` | Single question |
| `POST` | `/api/questions` | Create |
| `PUT` | `/api/questions/{id}` | Update |
| `DELETE` | `/api/questions/{id}` | Delete |

**Question filter params:** `subjectId`, `topicId`, `difficulty`, `questionType`, `search`, `page`, `size`

**Question create/update body:**
```json
{
  "questionText": "What does <var>O(n log n)</var> mean?",
  "questionType": "MULTIPLE_CHOICE_ONE_RIGHT_CHOICE",
  "difficulty": "INTERMEDIATE",
  "topicId": "...",
  "questionChoices": "[{\"value\":\"Linearithmic\",\"isAnswer\":true},{\"value\":\"Quadratic\",\"isAnswer\":false}]",
  "questionAnswer": null,
  "answerLines": 1
}
```

### Templates

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates?subjectId=&page=0&size=10` | Paginated list |
| `GET` | `/api/templates/{id}` | Single template |
| `POST` | `/api/templates` | Create |
| `PUT` | `/api/templates/{id}` | Update |
| `DELETE` | `/api/templates/{id}` | Delete |

**Template create/update body:**
```json
{
  "title": "Midterm Exam",
  "subjectId": "...",
  "parts": [
    {
      "title": "Section A — Easy MCQ",
      "numberOfQuestions": 10,
      "questionType": "MULTIPLE_CHOICE_ONE_RIGHT_CHOICE",
      "topicIds": ["...", "..."],
      "difficulties": [
        { "difficulty": "BEGINNER", "difficultyValue": 40 },
        { "difficulty": "EASY",     "difficultyValue": 60 }
      ]
    }
  ]
}
```

### Exam Paper Generation

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/exam-papers/generate` | Generate and download `.docx` |

**Request body:**
```json
{ "templateId": "...", "title": "Optional custom title" }
```

**Response:** `application/zip` — a ZIP archive containing the generated `.docx` file.

### Exam History

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/exam-history?page=0&size=10` | Paginated history list |
| `POST` | `/api/exam-history/{id}/download` | Re-download as `.docx` |
| `DELETE` | `/api/exam-history/{id}` | Delete record |

---

## Data Model

```
User
 └─ Subject (many)
     ├─ Topic (many)
     │   └─ Question (many)
     │       ├─ questionType: MULTIPLE_CHOICE_ONE_RIGHT_CHOICE
     │       │                MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE
     │       │                TRUE_FALSE | GAP_FILLING | SHORT_ANSWER
     │       └─ difficulty:   BEGINNER | EASY | INTERMEDIATE | ADVANCED
     │
     └─ Template (many)
         ├─ TemplatePart (many, ordered by seqNumber)
         │   ├─ topics (many-to-many with Topic)
         │   └─ TemplatePartDifficulty (many)
         │       └─ difficulty + difficultyValue (0–100 %)
         └─ ExamHistoryRawText (many)
```

---

## Project Structure

```
EPMS/
├── EPMS-backend/                   # Spring Boot API
│   └── src/main/java/.../EPMS/
│       ├── config/                 # Security, CORS, RestTemplate
│       ├── constant/               # Difficulty, QuestionType enums
│       ├── controller/             # REST controllers
│       ├── dto/                    # Request / response DTOs
│       ├── entity/                 # JPA entities
│       ├── filters/                # JWT auth filter
│       ├── repository/             # Spring Data repositories
│       └── service/                # Business logic
│
├── EPMS-frontend/                  # Angular SPA
│   └── src/app/
│       ├── core/                   # Auth service, interceptors
│       ├── features/
│       │   ├── homepage/           # Subjects page
│       │   ├── questions/          # Questions page
│       │   ├── templates/          # Templates page + exam generation
│       │   ├── history/            # Exam history page
│       │   └── profile/            # User profile
│       └── shared/                 # Modal, header, pagination components
│
└── EPMS-paper-generator/           # Node.js docx microservice
    ├── data/
    │   └── times-roman-widths.json # Pre-built glyph width table (2 790+ entries)
    ├── scripts/
    │   └── buildGlyphWidths.ts     # Reads Times New Roman.ttf → times-roman-widths.json
    └── src/
        ├── index.ts                # Express app, port 3001
        ├── types.ts                # Shared request/response types
        ├── routes/generate.ts      # POST /generate endpoint
        ├── services/docxGenerator.ts  # Word document assembly
        └── utils/xmlParser.ts      # XML tag → TextRun converter
```

---

## XML Formatting in Questions

Question text and MCQ choice values support a small set of inline XML tags:

| Tag | Renders as |
|---|---|
| `<b>text</b>` | **bold** |
| `<i>text</i>` | *italic* |
| `<var>name</var>` | `monospace` (variable name, purple highlight in preview) |
| `<code>snippet</code>` | `monospace` (code snippet) |

Example:
```
What is the time complexity of <var>Arrays.sort()</var> in Java?
```

HTML entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`) are decoded automatically.

---

## Difficulty Distribution

Each template part can optionally specify a difficulty distribution that controls how questions are randomly selected:

```
Section A: 10 questions
  ├── BEGINNER     30%  →  3 questions
  ├── EASY         50%  →  5 questions
  └── INTERMEDIATE 20%  →  2 questions
```

Percentages do not need to sum to exactly 100 — any shortfall is filled from the remaining available question pool. If no distribution is specified, questions are drawn uniformly from all difficulties.
