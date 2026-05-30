# ForensiQ Lite - Demo Script

## 10-Minute Demo Flow

### Pre-Demo Setup (2 minutes)

1. **Open in browser:** http://localhost:3000
2. **Login credentials:**
   - Email: `demo@forensiq.io`
   - Password: `Demo@1234`
3. **Enable DEV mode** (if not already on demo data)

### Opening Demo (30 seconds)

> "ForensiQ Lite is a forensic audit intelligence platform. It helps CA firms investigate financial fraud faster by automating transaction analysis and red flag detection."

### Demo Step 1: Dashboard (1 minute)

**What to show:**
- Total cases count (5 demo cases)
- Active investigations
- Recent red flags detected
- Case status breakdown chart

**What to say:**
> "This is your command center. You can see at a glance how many investigations are active, how many red flags have been raised, and the overall health of your case pipeline."

### Demo Step 2: Create New Case (1 minute)

**What to show:**
1. Click "New Case" button
2. Enter case name: "ABC Corp Audit"
3. Add description: "Annual financial audit Q4 2023"
4. Set priority: High
5. Click "Create Case"

**What to say:**
> "Creating a case takes seconds. Just give it a name, description, and priority level. The system automatically generates a unique case ID."

### Demo Step 3: Import Bank Statement (1 minute)

**What to show:**
1. Open the new case
2. Click "Import Transactions"
3. Upload sample CSV (use sample_data.csv from docs)
4. Watch progress bar
5. Show parsed transactions table

**What to say:**
> "You import bank statements - any format works. We parse it, normalize the data, and prepare it for analysis. This demo data has 150 transactions."

### Demo Step 4: Red Flag Detection (2 minutes)

**What to show:**
1. Navigate to "Red Flags" tab
2. Show the list of detected flags
3. Click on a high-priority flag
4. Show flag details panel:
   - Rule that triggered it
   - Transaction details
   - Risk score
   - Related entities

**What to say:**
> "Our rule-based engine scans every transaction against 25+ detection rules. Each flag is explainable - you can see exactly which rule triggered it, the confidence score, and the affected transaction details."

**Highlight these flags:**
- Large cash deposits (>$10,000)
- Round number transactions
- Weekend transactions
- Related parties flagged

### Demo Step 5: Fund Flow Analysis (1.5 minutes)

**What to show:**
1. Click "Fund Trail" tab
2. Show the flow diagram
3. Highlight source → intermediate → destination
4. Click on a node to see details
5. Show transaction chain

**What to say:**
> "This is fund flow analysis. You can trace money from source to destination, see intermediate accounts, and understand the full path. Each node shows transaction totals and risk indicators."

### Demo Step 6: AI Intelligence (1 minute)

**What to show:**
1. Click "AI Intelligence" tab
2. Ask a question: "Summarize the suspicious patterns in this case"
3. Wait for response (if Ollama is running)
4. Show the AI analysis

**What to say:**
> "Our AI assistant analyzes the entire case and provides insights. It's optional and local-first - nothing leaves your machine. Note: AI requires Ollama to be running locally."

### Demo Step 7: Entity Resolution (1 minute)

**What to show:**
1. Click "Entities" tab
2. Show identified entities (companies, people)
3. Click on an entity to see all related transactions
4. Show entity relationship map

**What to say:**
> "Entity resolution automatically identifies and links related parties - companies, individuals, accounts. This helps you see connections that might otherwise be missed."

### Closing (30 seconds)

**What to say:**
> "That's ForensiQ Lite. It's designed to reduce your investigation time by automating the tedious parts - parsing statements, detecting patterns, tracing funds. The rule-based approach means every finding is explainable and defensible."

**Key selling points:**
- No vendor lock-in (runs locally)
- Explainable AI (not black box)
- Fast setup (Docker one-liner)
- CA firm focused features

---

## Demo Credentials

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Demo Auditor | `demo@forensiq.io` | `Demo@1234` | Pre-loaded with sample cases |
| Admin | `admin@forensiq.io` | `Admin@1234` | Full admin access |

---

## Sample Data Location

- Demo bank statement: `/docs/pilot-demo/sample_transactions.csv`
- Demo CSV format: Standard bank export with Date, Description, Amount, Balance

---

## What NOT to Show

1. **AI tab without Ollama running** - Will show error
2. **Database connection errors** - Ensure PostgreSQL is running
3. **Prisma Studio** - Too technical for demo
4. **Backend API logs** - Show in terminal only if asked
5. **Source code** - Keep focus on product value
6. **Long-running operations** - Pre-generate data before demo
7. **Error states** - Clear logs before starting

---

## Troubleshooting During Demo

| Issue | Quick Fix |
|-------|-----------|
| "Database unavailable" | Run: `docker-compose up -d postgres` |
| "Login failed" | Check `.env` has `DEV_AUTH_BYPASS=true` |
| "AI not responding" | Explain AI is optional, runs locally via Ollama |
| "Slow load times" | Explain this is dev mode, production is faster |
| "Missing data" | Run: `pnpm db:seed` to reset demo data |