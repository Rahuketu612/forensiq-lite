# ForensiQ Lite - Known Limitations

## MVP Status

ForensiQ Lite is currently in MVP (Minimum Viable Product) stage. The following limitations exist and are expected to be addressed in future releases.

---

## Technical Limitations

### Database

- **Single database instance:** No multi-tenant support
- **No read replicas:** All operations hit primary
- **Limited connection pooling:** May struggle with 100+ concurrent users
- **No automated backups:** Manual backup scripts only

### API

- **No rate limiting on some endpoints:** May be vulnerable to abuse
- **No API versioning strategy:** Breaking changes possible
- **No request deduplication:** Duplicate requests processed
- **No caching layer:** Every request hits database

### Authentication

- **No MFA:** Single-factor authentication only
- **No SSO/SAML:** External identity providers not supported
- **No password expiry:** Security policy gaps
- **Session timeout not enforced:** Extended sessions possible

### Performance

- **Large file uploads may timeout:** No chunked upload support
- **No pagination on some endpoints:** Can return thousands of records
- **No lazy loading:** Heavy initial page loads
- **No query optimization:** Complex queries may be slow

---

## Feature Gaps

### Import/Export

- **Limited file formats:** CSV only, no PDF/Excel bank statements
- **No batch import:** One file at a time
- **No export to PDF:** Must use screen capture for reports
- **No data API:** Cannot pull from external systems

### Analysis

- **Rule editing requires code changes:** No UI for rule management
- **No custom fields:** Fixed data model
- **No case templates:** Every case is manual setup
- **No audit trail:** Cannot see who made changes

### AI Features

- **Ollama required for AI:** Not auto-installed
- **Limited model support:** Only phi4 tested
- **No streaming responses:** Long AI queries feel slow
- **No AI model fine-tuning:** Using base models only

### Visualization

- **No print-friendly views:** Reports optimized for screen
- **Limited chart types:** Basic bar/line charts only
- **No interactive graphs:** Fund flow is read-only
- **No data export:** Cannot export analysis results

---

## Security Limitations

### Current Gaps

- **No WAF:** Vulnerable to web attacks
- **No input sanitization:** XSS possible
- **No SQL injection protection:** Prisma prevents some, not all
- **No CSRF tokens:** State-changing requests vulnerable

### Data Protection

- **No encryption at rest:** Database files unencrypted
- **No field-level encryption:** Sensitive data readable
- **No data masking:** PII visible in logs
- **No audit logging:** Cannot track data access

### Access Control

- **No role-based access:** All users have same permissions
- **No resource-level permissions:** Cannot restrict case access
- **No IP allowlisting:** Cannot restrict access by IP
- **No session management:** Cannot force logout users

---

## Operational Limitations

### Deployment

- **No Kubernetes manifests:** Docker only
- **No health check alerts:** Must monitor manually
- **No auto-scaling:** Fixed resource allocation
- **No disaster recovery plan:** Single region only

### Monitoring

- **No APM integration:** No application performance monitoring
- **No error tracking:** No Sentry/Bugsnag integration
- **No metrics dashboard:** No Prometheus/Grafana
- **No log aggregation:** Logs only on stdout

### Support

- **No documentation site:** Only README
- **No support SLA:** Community support only
- **No bug bounty:** Security issues not incentivized
- **No feature roadmap public:** Development path unclear

---

## Browser Compatibility

### Tested Browsers

- ✅ Chrome 120+ (recommended)
- ✅ Firefox 121+
- ✅ Safari 17+
- ⚠️ Edge 120+ (limited testing)
- ❌ Internet Explorer (not supported)
- ❌ Mobile browsers (not tested)

### Known Browser Issues

- **Safari:** Fund flow visualization may not render
- **Firefox:** PDF export may be slow
- **Mobile:** Not optimized for phones/tablets

---

## Data Limitations

### Storage

- **No file size limit enforcement:** Large files may crash
- **No compression:** Raw storage only
- **No archival:** Old data stays in primary tables
- **No purge policy:** Data grows indefinitely

### Integrity

- **No duplicate detection:** Can import same data twice
- **No data validation:** Garbage in, garbage out
- **No referential integrity checks:** Manual validation
- **No transaction rollback:** Errors may corrupt state

---

## Internationalization

### Current Support

- ⚠️ English only (UI and messages)
- ❌ No RTL languages
- ❌ No i18n framework
- ❌ No currency formatting for all locales
- ❌ No date format localization

### Currency

- ✅ USD primary
- ⚠️ Other currencies may display incorrectly
- ❌ No exchange rate support
- ❌ No crypto support

---

## Development Limitations

### Code Quality

- **No E2E tests:** Manual testing only
- **No performance benchmarks:** Unknown performance limits
- **No security audit:** Never penetration tested
- **No code coverage:** Unknown test coverage

### CI/CD

- **No automated releases:** Manual deployment
- **No canary deployments:** All-or-nothing updates
- **No rollback automation:** Manual rollback only
- **No feature flags:** All features enabled

---

## Priority Fixes

### High Priority

1. Add input sanitization for XSS prevention
2. Implement rate limiting
3. Add MFA support
4. Create pagination for large datasets

### Medium Priority

1. Add role-based access control
2. Improve file upload handling
3. Add error tracking (Sentry)
4. Create backup automation

### Low Priority

1. i18n framework setup
2. Mobile responsive design
3. API documentation site
4. Performance optimization

---

*Last Updated: May 2026*
*Version: 0.1.0*