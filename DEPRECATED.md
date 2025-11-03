# Deprecated Tutor Endpoints (14-day grace)

- `/api/tutor/explain`
- `/api/tutor/options`
- `/api/tutor/save-to-backpack`
- `/api/tutor/markdown`
- `/api/tutor/simplify`

Status: **410 Gone**  
Observation window: **14 days from merge**

These endpoints have been superseded by the detect → warmup → solve flow.  
After the 14-day window, delete the route handlers, legacy types, and archived DB tables.
