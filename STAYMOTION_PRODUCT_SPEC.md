# StayMotion — Product Master Spec

## 1. Product thesis

StayMotion is not a prettier checklist system. It is an operational follow-up layer for hospitality businesses.

Core promise in Norwegian:

> **Driften som passer på seg selv.**

The product should reduce the amount of reminding, chasing, checking and manual handover work that managers perform every day.

## 2. Initial market

Primary initial segment:
- restaurant chains
- hotel groups
- cafés and bars with multiple locations
- hospitality operators with roughly 3–20 locations first

Single-location businesses may still use the product, but the strongest value appears when operations need to be consistent across many locations.

## 3. Data hierarchy

`Organization → Region → Location → Department → Employee`

Roles:
- Owner / HQ: all locations
- Regional manager: assigned locations
- Location manager: one location
- Shift leader: current shift / department
- Employee: own tasks, reports, team communication, training

## 4. Product principles

1. Employees should be able to understand the app without training.
2. Managers should open the app and feel less stress, not more.
3. A dashboard should show decisions and exceptions, not raw activity counts.
4. Voice/photo capture should replace long forms whenever safe.
5. StayMotion should perform follow-up automatically where possible.
6. Critical compliance entries require traceability and appropriate confirmation.
7. Every AI action must have an audit trail.
8. Build for multilingual teams from the start.
9. AI should be model-routed; expensive models are not used for routine classification.
10. The product must work well on employee phones, shared tablets and manager desktops.

## 5. Core experiences

### Employee Home
Question answered: **What do I need to do now?**

- 1–3 immediate tasks
- large Tell StayMotion button
- photo/report shortcut
- team / shift handover
- training
- no management dashboard clutter

### StayMotion Capture
Employee can speak or photograph an operational issue.

Example:
> “Fryser nummer to viser minus åtte igjen.”

System extracts:
- event type
- location
- department
- equipment
- measurement/value
- severity
- probable required workflow
- prior related incidents

Then:
- create incident
- notify responsible role
- schedule follow-up
- remind automatically
- escalate only if unresolved

### Manager Home
Question answered: **What actually needs me?**

Primary content:
- calm health state
- number of issues needing manager attention
- actions StayMotion already handled
- critical or repeated patterns
- short operational handover

### Chain / HQ
Question answered: **Where is the risk and what is changing?**

- location health
- completion / compliance trends
- repeated incident patterns
- supplier / maintenance recurrence
- training gaps
- comparison between locations
- ask StayMotion natural-language interface

## 6. Core differentiators

### Automatic follow-up
StayMotion handles reminders, acknowledgements, deadlines and escalation.

### Shift Handover
20–30 seconds of voice becomes a structured handover with owners, status and follow-up.

### Chain Intelligence
Patterns across locations are detected automatically.

### Operational multilingual layer
HQ can write in Norwegian; staff can read and respond in their preferred supported language. Operational meaning must remain auditable.

### Ask StayMotion
Examples:
- Which location has the highest operational risk?
- Who is missing mandatory training?
- Which maintenance issues have been open for more than 7 days?
- Are there repeated refrigeration incidents?

## 7. Initial modules

Phase 1:
- Auth / roles
- organizations / locations
- employee home
- manager home
- chain dashboard
- tasks
- incidents / deviations
- StayMotion Capture
- automatic follow-up engine
- comments / communication
- audit log

Phase 2:
- shift handover
- training
- SOP / document library
- multilingual communication
- recurring routines
- notifications

Phase 3 hospitality packages:
- food safety / IK-mat
- alcohol routines
- HSE / HMS
- fire safety
- hotel housekeeping
- room inspection
- maintenance
- inspection readiness
- sensor integrations

## 8. Technical target

### Web
Next.js + TypeScript

### Mobile
Expo / React Native + TypeScript

### Backend
Supabase:
- Postgres
- Auth
- Storage
- Realtime
- RLS

### AI layer
Server-side routing between:
- transcription
- cheap classification / extraction
- vision
- translation
- stronger reasoning for chain analysis

Never expose provider keys in clients.

## 9. Core entities

- organizations
- regions
- locations
- departments
- profiles
- memberships
- shifts
- tasks
- task_assignments
- routines
- routine_runs
- incidents
- incident_events
- assets / equipment
- messages
- handovers
- training_courses
- training_assignments
- notifications
- ai_actions
- audit_events

## 10. Design direction

Brand: **StayMotion**

Language: Norwegian first.

Visual character:
- premium but calm
- warm dark green / charcoal brand surfaces
- light employee and operational surfaces for readability
- muted cream rather than sterile pure white
- mint only for positive/action intelligence
- red reserved for genuine critical issues
- large whitespace
- very low information density for employees
- rich but still calm desktop interface for managers

Avoid:
- purple AI gradients
- generic SaaS dashboard grids
- excessive charts
- emoji-based enterprise UI
- alert overload
- fake futuristic visuals

## 11. Pricing hypothesis

Not final.

Initial pilot target:
- roughly 990–1490 NOK / location / month

Mature target:
- roughly 1990 NOK / location / month as a likely sweet spot
- chain / HQ layer may include organization fee
- setup / onboarding fee for multi-location customers

Pricing should ideally be per location with generous or unlimited employee seats.

## 12. Sales thesis

Do not sell “AI software.”

Lead with:

> Hvor mye tid bruker restaurantsjefene deres på å minne ansatte, sjekke at ting er gjort og følge opp småproblemer?

Then demonstrate that StayMotion performs this follow-up automatically.

Pilot should initially run alongside a customer's existing system so switching risk is low.

Proof metrics:
- manager follow-ups automated
- completion rate improvement
- manager hours saved
- repeated issues caught
- response / closure time

## 13. Current branch

Development branch:
`staymotion/operations-v1`

Current prototype:
- `index.html` — public product story
- `app.html` — interactive role-based demo

Do not destroy production history until the new direction has been visually and technically verified.
