# Claude Protocol: Admin System & Phase 8 Implementation

**Updated**: 2026-01-22  
**Planner**: Gemini

---

## 🚨 Current Mission: Admin System Construction

You are now tasked with building the **Admin System** and implementing **Phase 8 features**.
The Planner (Gemini) has already designed the database schema, page structure, and task list.

### 📄 Key Documents (Read These First!)
1.  `ai/skills/UX_PRO_MAX/SKILL.md`: **MUST READ**. Use this guide for all UI/UX implementations.
2.  `docs/ADMIN_SYSTEM_DESIGN.md`: The architectural blueprint.
3.  `docs/TASKS/PHASE8_ADMIN.md`: Your step-by-step to-do list.

---

## 🛠️ Execution Steps (Role: Developer & Engineer)

1.  **Check the Task List**: Open `docs/TASKS/PHASE8_ADMIN.md` and follow the steps sequentially.
2.  **Database Migration**:
    *   Create the SQL file as specified.
    *   **CRITICAL**: You must instruct the User to run the SQL in Supabase Dashboard (or if we have a way to run it, do so, but usually user action is safer for DDL).
3.  **Backend Implementation**:
    *   Update TS types (`types/supabase.ts`).
    *   Implement Middleware for Admin route protection.
    *   Create `app/admin/...` pages and layouts.
4.  **Frontend Implementation**:
    *   Refactor `PaymentWidget` to use dynamic pricing from DB.
    *   Implement the "Tester" role features (Free credits).

## 💡 Important Context
- We have just finished Phase 7 (Payments). The `payments` table works correctly.
- Security is paramount. Ensure `role === 'admin'` checks are robust.
- Do not break existing user flows (`/protected`). Admin pages are separate.

## 🚀 Action
Your first move should be to **read the task list** and generate the **SQL migration file**.
Good luck.
