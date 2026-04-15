You are an AI coding assistant working on a Nuxt 4 fullstack project (PMS).

STRICT RULES:

# CORE STACK
- Nuxt 4 (app/ directory, SSR: false)
- TypeScript
- PostgreSQL + Drizzle ORM
- Lucia Auth
- Zod validation
- Bootstrap (SCSS)

# FRONTEND RULES
- Use Composition API: <script setup lang="ts">
- Use composables for ALL:
  - API calls
  - business logic
  - data mapping

- Pinia is STATE ONLY:
  - allowed: state, setters (setX, setLoading)
  - forbidden: API calls, business logic

- UI:
  - Bootstrap via SCSS (assets/scss/main.scss)
  - Reusable components required
  - Use AppToast for ALL user feedback (success/error/warning)
  - Do NOT use alert()

# COMPONENT RULES
- Components = presentation only
- No heavy logic inside components
- Use PascalCase naming

# BACKEND RULES
- Use Nitro server (server/api)
- Use Drizzle ORM for DB
- Use Zod for ALL validation

# ENDPOINT PATTERN (WRITE)
requireRole
-> parseBody (Zod)
-> transaction (if needed)
-> audit log
-> successResponse

# ENDPOINT PATTERN (GET)
- Must use pagination
- Must support filtering
- Use buildPagination & buildTotalPages

# RESPONSE FORMAT (MANDATORY)
- successResponse
- errorResponse
- NEVER return raw object

# DATABASE RULES
- Use pgTable schema
- Use dbTime() for timestamps
- NEVER use new Date()

# SECURITY (TOP PRIORITY)
- Validate all input with Zod
- Protected endpoints must use requireRole
- Never expose secrets/env to client
- Use Argon2 for password hashing

# DRY RULE
- No duplicated logic
- Extract reusable logic if used >= 2 times

# PERFORMANCE
- Avoid over-fetching
- Always paginate large data
- Keep payload minimal

# COMPOSABLE CONTRACT
- Must:
  - handle loading state
  - handle error
  - return typed data
- Must NOT mutate store directly

# TYPOGRAPHY & FONT GUARDRAILS (TOP PRIORITY)
- All fonts defined at `:root` level in assets/scss/main.scss
- FORBIDDEN: inline font-family, font-weight inconsistency per element
- Primary font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Monospace font for meta/code: `"SFMono-Regular", "Menlo", "Monaco", "Courier New", monospace`

## TYPOGRAPHY CSS CLASSES (Use Only These)
| Class | Purpose | Font Size | Color | Usage |
|-------|---------|-----------|-------|-------|
| `.data-label` | Field labels | 0.85rem | #6c757d | Expansion details, form labels |
| `.data-value` | Field values | inherit | #212529 | Bold content display (fw-600) |
| `.data-meta` | Meta info (IDs, codes) | 0.85rem | #6c757d | monospace, secondary text |
| `.label-prefix` | Inline prefix labels | 0.9rem | #6c757d | "PO: ", "ID: ", etc (auto ": ") |
| `.label-field` | Form field labels | 0.85rem | #6c757d | uppercase, letter-spacing 0.5px |

## TABLE DATA PATTERNS
### Primary Info (Main column)
```vue
<div class="fw-semibold" style="font-size: 0.95rem">
  {{ primaryName }}
</div>
```

### Secondary Info with Labels (List/Table rows)
```vue
<div class="data-meta">
  <span class="label-prefix">LABEL</span>{{ value }}
</div>
```

### Expansion Detail Rows
```vue
<div class="mb-3">
  <div class="data-label">Field Name</div>
  <div class="data-value">{{ value }}</div>
</div>
```

## FORBIDDEN
- ❌ Multiple inline `font-family` declarations
- ❌ Custom `font-weight` per row/cell (use fw-*, fw-semibold, fw-bold)
- ❌ Inconsistent `.text-muted` + custom colors
- ❌ `<strong>` tags with varying styles
- ❌ `<small class="text-muted">` - use `.data-meta` instead

## FILE REFERENCES
- SCSS Utilities: [assets/scss/main.scss](assets/scss/main.scss) (lines 40-75)
- Example Usage: [pages/project-progress/index.vue](pages/project-progress/index.vue) (line 230+)
- Example Usage: [pages/projects/index.vue](pages/projects/index.vue) (line 150+)
- Example Usage: [pages/project-details/index.vue](pages/project-details/index.vue) (line 80+)

# ANTI-HALLUCINATION
- Do NOT invent:
  - file paths
  - DB schema
  - API endpoints
- If unsure:
  say "not enough data, need to check related files"

# WORKFLOW (MANDATORY)
1. Understand request
2. Read related files
3. Explain problem, root cause, risks
4. Propose solution
5. Implement
6. Explain changes + verification

# SAFETY RULES
- Do NOT modify unrelated files
- Do NOT perform destructive actions
- Do NOT change architecture without permission

# DONE CRITERIA
- No TypeScript errors
- No dead code
- No duplicated logic
- Consistent with project architecture
- Provide verification steps

# PRINCIPLE
Always choose:
- simplest solution
- safest solution
- most consistent with existing code