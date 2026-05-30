# ForensiQ Lite - Pilot Deployment Checklist

## Pre-Pilot Checklist

### Environment Setup

- [ ] **Node.js >= 20.0.0** installed
- [ ] **pnpm >= 9.0.0** installed
- [ ] **Docker** installed and running
- [ ] **Clone repository** to local machine
- [ ] **Run setup:** `pnpm setup:local`
- [ ] **Start PostgreSQL:** `docker-compose up -d postgres`
- [ ] **Initialize database:** `pnpm db:push && pnpm db:seed`

### Verification Steps

- [ ] **Frontend accessible:** http://localhost:3000
- [ ] **Backend health:** `curl http://localhost:3001/api/v1/health`
- [ ] **Demo login works:** Use demo@forensiq.io / Demo@1234
- [ ] **Sample case visible:** Dashboard shows demo cases
- [ ] **No console errors:** Open browser DevTools, check for red errors

### Data Verification

- [ ] **Demo cases loaded:** At least 5 sample cases
- [ ] **Transactions imported:** Demo cases have transaction data
- [ ] **Red flags detected:** Cases show detected flags
- [ ] **AI tab accessible:** (if Ollama installed)

---

## Pilot Session Checklist

### Demo Preparation (Before Meeting)

- [ ] Restart services fresh
- [ ] Clear browser cache
- [ ] Login as demo user to verify session
- [ ] Have backup commands ready
- [ ] Test internet connection (for remote demos)

### During Demo

- [ ] Start with dashboard overview
- [ ] Show one completed case with red flags
- [ ] Show fund flow on a flagged case
- [ ] Demonstrate entity resolution
- [ ] Mention AI as optional feature
- [ ] Leave 5 minutes for questions

### Post-Demo

- [ ] Document any questions raised
- [ ] Note feature requests
- [ ] Record feedback on UX
- [ ] Note any errors encountered
- [ ] Identify next steps

---

## Pilot Feedback Questions

### Discovery Questions

1. "What audit software are you currently using?"
2. "How long does a typical investigation take?"
3. "What manual steps take the most time?"
4. "How do you currently detect fraud patterns?"

### Product Feedback Questions

1. "Was the dashboard information clear and useful?"
2. "How easy was it to understand the red flag detection?"
3. "Did the fund flow visualization help you understand money trails?"
4. "Would entity resolution save you time?"
5. "What additional rules would you want to add?"

### Technical Questions

1. "Do you have a preferred database platform?"
2. "How many concurrent users would you need?"
3. "Is local deployment preferred over cloud?"
4. "Do you need integration with existing tools?"

### Closing Questions

1. "What would make this more useful for your practice?"
2. "Are there cases you could test this on?"
3. "What would your timeline look like for adopting?"
4. "Who else would need to approve this decision?"

---

## Common Issues & Fixes

### Database Connection Failed

```bash
# Fix: Restart PostgreSQL
docker-compose down
docker-compose up -d postgres
pnpm db:push
```

### Demo Data Missing

```bash
# Fix: Reset database
pnpm db:reset
pnpm db:seed
```

### Port Already in Use

```bash
# Find what's using port 3000/3001
lsof -i :3000
lsof -i :3001

# Kill process or change ports in .env
```

### Build Errors

```bash
# Fix: Clean and rebuild
rm -rf node_modules .next apps/*/dist packages/*/dist
pnpm install
pnpm build
```

---

## Sign-Off Checklist

- [ ] CA firm representative witnessed demo
- [ ] All questions addressed
- [ ] Technical requirements confirmed
- [ ] Feedback documented
- [ ] Next steps agreed
- [ ] Follow-up scheduled

---

## Emergency Contacts

| Issue | Contact |
|-------|---------|
| Technical issues | GitHub Issues: github.com/Rahuketu612/forensiq-lite/issues |
| Feature requests | Email: support@forensiq.io |
| Commercial inquiries | Email: sales@forensiq.io |