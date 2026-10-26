# Eventique — Intelligent AI Event Planning Assistant

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-Flash-orange?style=flat&logo=google)](https://aistudio.google.com/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-green?style=flat)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Security Hardened](https://img.shields.io/badge/Security-Hardened%20CSP%20%2B%20Rate%20Limit-purple?style=flat)]()
[![Tests](https://img.shields.io/badge/Tests-Passing%20(3%20Suites)-brightgreen?style=flat)]()

**Eventique** is an event planning platform engineered for **Promptwars (Hack2skill / Google Developer Challenge 5)**. It transforms high-level event concepts into complete, actionable, budget-optimized, and timeline-scheduled event execution plans using **Google Gemini AI** combined with deterministic calculation engines.

---

## 🎯 Scoring Criteria & Architectural Highlights

This project was built to meet and exceed the six Hack2skill evaluation criteria:

| Evaluation Criteria | Implementation Details |
| :--- | :--- |
| **Problem Statement Alignment** | End-to-end event planning: dynamic budget allocation, chronological timeline generation, vendor matching & comparison, interactive what-if scenario testing, and live AI event concierge. |
| **Code Quality & Architecture** | Strict TypeScript type safety, modular layered architecture, deterministic mathematical engines separated from AI reasoning, zero ESLint warnings, SSR hydration safety. |
| **Efficiency & Latency** | In-memory SHA-256 hashed TTL caching for AI responses, client-side optimistic UI, deterministic calculations performed locally without redundant LLM calls. |
| **Security & Hardening** | Sliding-window IP rate limiting with HTTP 429 & Retry-After headers, prompt injection sanitization, strict Content Security Policy (CSP), X-Frame-Options (DENY), nosniff headers, and zero secret leakage. |
| **Testing & Robustness** | Automated test suites covering mathematical engine calculations, Zod schema runtime validation, prompt sanitizer defenses, and rate-limiting sliding windows. |
| **Accessibility (WCAG 2.1 AA)** | Keyboard-navigable WAI-ARIA tab controls, high-contrast focus rings, screen-reader skip links, modal escape dismiss, and `prefers-reduced-motion` animations. |

---

## 🚀 Key Features

### 1. Hybrid AI + Deterministic Engine Architecture
- **Deterministic Math**: Budget allocations, contingency reserves, currency conversions (INR, USD, EUR, GBP), and timeline milestone sequencing are executed locally by TypeScript engines, ensuring 100% mathematical accuracy without floating-point drift or LLM hallucination.
- **Qualitative AI Reasoning**: Google Gemini AI is leveraged where it excels: qualitative vendor trade-offs, venue decor aesthetics, risk forecasting, and contextual concierge guidance.

### 2. Multi-Model Resilience & Self-Healing AI
- Powered by `gemini-3.5-flash` with automatic fallback to `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, and `gemini-3.6-flash`.
- Resilient against 503 high-demand spikes and API model deprecations.
- Structured JSON outputs strictly validated via **Zod schemas** with automatic budget sum normalization (guaranteeing exact 100% allocation).

### 3. Dynamic "What-If" Scenario Simulation Engine
- Simulate live event disruptions in real time:
  - **Guest Count Surge**: Instant recalculation of catering scale, venue capacity, and per-head cost.
  - **Budget Cuts**: Automated reallocation preserving critical vendors while trimming flexible line items.
  - **Vendor Dropouts**: AI-suggested backup suppliers and contingency timeline adjustments.
  - **Adverse Weather**: Contingency staging, indoor transition timing, and equipment protection.

### 4. Interactive Live Event Assistant
- Real-time conversational AI assistant aware of current event context (budget, timeline, guest count, city, theme).
- Context-injected suggestions with prompt injection filtering.

### 5. Enterprise-Grade Security
- **Prompt Injection Defense** (`src/lib/security/sanitizer.ts`): Strips instruction delimiters (`===`), role impersonations (`system:`, `user:`), template interpolation patterns, and dangerous script tags.
- **Sliding-Window Rate Limiter** (`src/lib/security/rate-limiter.ts`): Protects `/api/ai/plan`, `/api/ai/chat`, and `/api/ai/scenario` against abuse.
- **HTTP Security Headers** (`next.config.ts`): Content-Security-Policy, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy, and Permissions-Policy.

### 6. Accessibility & UX Excellence
- **WAI-ARIA Compliant**: Tablist and tab controls with keyboard arrow navigation.
- **Skip Navigation**: Accessible direct-to-content anchor for screen readers.
- **Motion Accessibility**: Respects `prefers-reduced-motion` settings.
- **Modern Glassmorphic Dark Design**: Custom typography, dynamic glow states, and zero generic styling.

---

## 📁 Repository Structure

```
challenge5/
├── src/
│   ├── app/
│   │   ├── api/ai/
│   │   │   ├── plan/route.ts         # Event plan generation API
│   │   │   ├── chat/route.ts         # Contextual AI assistant chat API
│   │   │   └── scenario/route.ts     # What-if scenario analysis API
│   │   ├── dashboard/page.tsx        # Event execution dashboard
│   │   ├── plan/new/page.tsx         # Multi-step event creation wizard
│   │   ├── globals.css               # Design system, glassmorphism, accessibility tokens
│   │   ├── layout.tsx                # Root layout with skip-nav & metadata
│   │   └── page.tsx                  # Landing hero page
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── BudgetBreakdown.tsx   # Visual budget chart & category allocation
│   │   │   ├── TimelineView.tsx      # Chronological phase & milestone schedule
│   │   │   ├── VendorsPanel.tsx      # Vendor comparison & quote tracker
│   │   │   ├── ScenarioSimulator.tsx # Real-time what-if stress tester
│   │   │   └── EventChatAssistant.tsx# AI event advisor floating widget
│   │   └── ui/                       # Reusable accessible UI components
│   ├── context/
│   │   └── EventContext.tsx          # Hydration-safe persistent event state
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gemini-client.ts      # Multi-model resilient Gemini client
│   │   │   ├── schemas.ts            # Zod validation & normalization schemas
│   │   │   ├── schemas.test.ts       # Schema automated test suite
│   │   │   └── ai-cache.ts           # SHA-256 hashed in-memory TTL cache
│   │   ├── engines/
│   │   │   ├── budget-engine.ts      # Deterministic budget calculation engine
│   │   │   ├── timeline-engine.ts    # Deterministic chronological timeline engine
│   │   │   ├── scenario-engine.ts    # Deterministic what-if stress engine
│   │   │   └── engines.test.ts       # Engine automated test suite
│   │   └── security/
│   │       ├── rate-limiter.ts       # Sliding-window IP rate limiter
│   │       ├── sanitizer.ts          # Prompt injection sanitizer
│   │       └── security.test.ts      # Security & cache automated test suite
│   └── types/
│       └── event.ts                  # Domain models & TypeScript interfaces
├── next.config.ts                    # Security headers, CSP, dev indicators
├── package.json                      # Dependencies and test runner scripts
├── tsconfig.json                     # Strict TypeScript configuration
└── .env.example                      # Environment variables template
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm or yarn
- Google Gemini API Key ([Get one free from Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/karthik-1806/Eventique.git
   cd Eventique
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   # Optional: customize model (defaults to gemini-3.5-flash with auto-fallback)
   GEMINI_MODEL=gemini-3.5-flash
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Validation

Run all automated test suites:

```bash
# Run unit & integration tests (Engines, AI Schemas, Security & Rate Limiter)
npm test

# Run ESLint (0 errors, 0 warnings)
npm run lint

# Validate TypeScript types without emit
npx tsc --noEmit

# Production build verification
npm run build
```

---

## 🛡️ Security & Privacy Notice
- API keys are strictly kept server-side in `.env.local` and never exposed to the client bundle.
- In-memory rate limiting and request body sanitization prevent prompt injection and resource abuse.
- Security headers enforce iframe isolation (`X-Frame-Options: DENY`) and strict content policies.

---

## 📜 License
Developed for **Promptwars Hack2skill / Google Developer Challenge 5**. Distributed under the MIT License.
