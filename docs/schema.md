# MARS — Data schema (A2)

The reference for the four MongoDB collections. Read this instead of opening the
model files. Source of truth: `backend/models/*.js`. If you change a model,
update this file in the same PR.

> **Deleting a user cascades to their reviews and flags (resolved).** The team
> decided that deleting an account also deletes that user's reviews.
> `MongoUserProfileService.deleteProfile` implements this. See
> [Deleting a user](#deleting-a-user) for the order, and for the rule that
> admin-initiated deletion must reuse it.

---

## Roles

There are two roles: `user` (a general user) and `admin`. The team agreed
these rules for A2. Code against them; don't work around them. Every rule is
enforced **on the server**. Hiding something in the UI is a convenience, never
the protection.

1. **Administrators have no profile page.** FR-15, FR-17 and FR-19 are for
   general users only. All three profile routes are guarded with
   `protect, requireRole('user')`, so an administrator calling one gets
   **403**. Hiding the button doesn't count as the guard.

2. **The Account Management Page lists general users only.** Filter by
   `{ role: 'user' }` **in the database query**. Don't fetch every user and
   remove admins in the frontend: admin documents should never leave the
   server, and a frontend filter would also make the page sizes and totals
   wrong.

3. **Administrators can't see or delete other administrators, and can't
   delete their own account.** The delete endpoint must refuse any target
   whose `role` isn't `user`, and respond **403** (the A1 convention for a
   forbidden action). An administrator's own account has `role: 'admin'`, so
   this one check also covers self-deletion. An explicit
   `target._id equals req.user.id` check costs nothing and makes the intent
   clear.

4. **Accounts can only be deleted once they've been inactive for more than
   five years.** The list shows the delete control only for those accounts,
   but that is just UX. The endpoint must check the threshold again against
   the stored `lastActivity`, and respond **403** if the account is still
   inside it. Inactive means `lastActivity < (now − 5 years)`.
   *Suggested approach (not agreed by the team):* load the target with a
   single filter that covers rules 3 and 4 together, such as
   `User.findOne({ _id, role: 'user', lastActivity: { $lt: cutoff } })`.
   That way the endpoint applies exactly the same test as the list query.
   It also handles accounts from before A2 (no `lastActivity` in the
   database) the same way in both places: they never match, so they can't
   be deleted. Don't compare in JavaScript on a `.lean()` document. The
   value is `undefined` there, and comparing `undefined` to a date always
   returns false, so the check would fail without any error.

5. **Administrator accounts are created directly in the database.** As in
   A1, nobody can choose the admin role when they register.
   `registerUser` only reads `name`, `email` and `password`, so any `role`
   in the request body is ignored and the role defaults to `user`. Keep it
   that way. For demos, `admin_demo` is created by the seed (see
   [Seed data](#seed-data)). The JWT carries a role, but `requireRole`
   doesn't use it. `protect` loads the user from the database on every
   request and sets it as `req.user`, and `requireRole` checks
   `req.user.role`. So a role change in the database takes effect on that
   user's next request, with no need to log in again.

**Who can do what to user accounts**

| Action | General user | Administrator |
|---|---|---|
| View/edit own profile (FR-15, FR-17, FR-19) | ✅ | ❌ 403 |
| List accounts (Account Management Page) | ❌ | ✅ general users only |
| See another administrator | ❌ | ❌ |
| Delete a general user inactive > 5 years | ❌ | ✅ (must reuse the cascade; see [Deleting a user](#deleting-a-user)) |
| Delete a general user active within 5 years | ❌ | ❌ 403 |
| Delete an administrator, including themselves | ❌ | ❌ 403 |
| Become an administrator | only by being promoted in the database | — |

## Relationships at a glance

```
User ─────1:N──── Review ────N:1───── Album
 │                  │                (tracks embedded)
 │                  │1:N
 │                  ▼
 └──1:N (flaggedBy)─ FlaggedReview
```

| From | Field | To | Required |
|---|---|---|---|
| Review | `userId` | User | yes |
| Review | `albumId` | Album | yes |
| FlaggedReview | `reviewId` | Review | yes |
| FlaggedReview | `flaggedBy` | User | yes |

MongoDB doesn't enforce any of these references. Application code has to
keep them consistent, which is why the cascades below exist.

## What deleting cascades to

| Delete a… | Also deletes | Where | Order |
|---|---|---|---|
| **Album** | its reviews, and every flag on those reviews | `albumController.deleteAlbum` | flags → reviews → album |
| **Review** | every flag on that review | `reviewController.removeReview`, called by both the author's delete (`DELETE /api/reviews/:id`) and the admin's delete (`DELETE /api/admin/flagged-reviews/:reviewId`) | flags → review, then the album's rating is recalculated for the response |
| **User** | flags on their reviews, their reviews, and the flags they raised | `MongoUserProfileService.deleteProfile` | flags on their reviews → their reviews → flags they raised → user |
| **FlaggedReview** | nothing (it is a leaf) | — | — |

The deletes run in order from the leaves up to the parent. None of them run
in a transaction. If one step fails, the steps before it have already
happened, but nothing is left pointing at a parent that no longer exists.
The worst case is a half-finished delete, which you can safely run again.

### Deleting a user

The team decided that deleting an account also deletes that user's reviews.
`MongoUserProfileService.deleteProfile` (`backend/services/UserProfileService.js`)
deletes in this order:

1. flags on the user's reviews
2. the user's reviews
3. flags the user raised
4. the user

Album ratings don't need recalculating, because `averageRating` is computed
from reviews on every request.

> **Any future admin-initiated user deletion must call this same cascade
> rather than write its own.** That includes the inactive-account deletion
> on the Account Management Page. A second copy can drift out of order or
> miss a step, and leave orphans behind.
>
> `deleteProfile` as it stands also checks the account owner's current
> password, which an admin won't have. So reusing it means moving the four
> delete steps into a shared function that both paths call, not copying
> them.

**Deleting a user outside the app** (for example in Atlas) skips the cascade
and leaves orphaned reviews behind. `serializeReview` still reads
`review.userId.name` without a null check, so one orphaned review makes
`GET /api/albums/:id/reviews` return 500 for that album. The admin
moderation list doesn't have this problem: it shows "Deleted user" instead.
Delete users through the app.

---

## User

`backend/models/User.js` · collection `users` · `timestamps: true`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `name` | String | required | Display name. A1 returns this as `userName` on every review. **Keep it.** |
| `email` | String | required, unique, lowercase, trim | Never serialise into a review or album response (NFR-03). |
| `password` | String | required | Hashed with bcrypt by the `pre('save')` hook. Use `updateOne` for any write that doesn't change the password, so the hook never runs. |
| `role` | String | enum `user`, `admin`; default `user` | Not chosen at registration. Admins are promoted directly in the DB. |
| `university` | String | — | Comes from the template, not used. |
| `address` | String | — | Comes from the template, not used. |
| `firstName` | String | — | A2 |
| `lastName` | String | — | A2 |
| `username` | String | unique, **sparse**, trim | A2. `sparse` lets many accounts have no username without breaking the unique index. Don't save `''` as a username: an empty string counts as a value and would collide. |
| `lastActivity` | Date | default `Date.now` | A2. Updated on every successful login. If that write fails, the user is still logged in. |
| `createdAt` / `updatedAt` | Date | automatic | `createdAt` **is** the registration date. There is no separate `registrationDate` field. `createdAt` is **immutable**: Mongoose silently drops it from any update, even one passed `{ timestamps: false }`. To backdate it (seed or test data only), write through `User.collection.updateOne`. |

**Indexes:** `email` unique; `username` unique sparse.

**Accounts that existed before A2** have no `createdAt` stored. Their
`lastActivity` exists only in memory: Mongoose fills in the default when it
loads the document, but the database has no value. So a database query such
as `{ lastActivity: { $lt: cutoff } }` **won't match them**. That's the safe
direction: old accounts are never deleted by mistake. The seed script stores
both fields for every demo account.

## Album

`backend/models/Album.js` · collection `albums` · `timestamps: true`

| Field | Type | Constraints |
|---|---|---|
| `title` | String | required |
| `artistName` | String | required |
| `releaseYear` | Number | — |
| `coverImageUrl` | String | — |
| `tracks` | [Track] | at least 1 |
| `createdAt` / `updatedAt` | Date | automatic |

**Track** is an embedded subdocument, not its own collection:
`trackNumber` Number (required), `title` String (required), `durationSec` Number.

**Indexes:** only the default `_id` index.

`averageRating` and `reviewCount` aren't stored. They're calculated from
reviews for each request (`utils/aggregateRating.js`).

## Review

`backend/models/Review.js` · collection `reviews` · `timestamps: true`

| Field | Type | Constraints |
|---|---|---|
| `userId` | ObjectId → User | required |
| `albumId` | ObjectId → Album | required |
| `stars` | Number | required, integer, 1–5 |
| `comment` | String | maxlength 250, default `''` |
| `createdAt` / `updatedAt` | Date | automatic |

**Indexes:** `{ userId: 1, albumId: 1 }` unique. The database itself allows
only one review per user per album (FR-05). The API reports a duplicate as 409.

## FlaggedReview

`backend/models/FlaggedReview.js` · collection `flaggedreviews` · `timestamps: true`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `reviewId` | ObjectId → Review | required | |
| `flaggedBy` | ObjectId → User | required | Take this from `req.user.id`, never from the request body. |
| `reason` | String | required; enum `Rude`, `Spam`, `Unrelated to Music Album` | |
| `status` | String | enum `pending`, `dismissed`; default `pending` | An admin dismisses a flag by setting it to `dismissed`, which removes it from the admin list (that list shows `pending` only). Without this, dismissed flags would stay in the list forever. |
| `createdAt` / `updatedAt` | Date | automatic | |

The team decided **not to record who dismissed a flag or when**. There's no
`resolvedBy` or `resolvedAt` field. `updatedAt` does change when a flag is
dismissed, but it also changes on any other update, so don't present it as
the dismissal time.

**Indexes:**
- `{ reviewId: 1, flaggedBy: 1 }` unique: one flag per user per review,
  enforced by the database the same way as the Review index. Report a
  duplicate as 409 (catch error code `11000`).
- `{ status: 1, createdAt: -1 }`: supports the admin list query
  "pending flags, newest first".

## Seed data

`backend/scripts/seedAlbums.js` can be run again without creating duplicates.
Users are matched by email, albums by title + artist, and reviews by
user + album.

| Accounts | Password | `createdAt` | `lastActivity` | Purpose |
|---|---|---|---|---|
| `brad`, `mika`, `henry`, `kenny`, `jasmine`, `dio`, `giorno`, `jolene`, `josuke` (`<name>@example.com`) | `Demo1234!` | fixed dates 2–9 Oct 2026, one per account (see `seedAlbums.js`) | time of the latest seed run | normal reviewers |
| `inactive_demo_1` (`inactive1@example.com`) | `Demo1234!` | 8 years before the seed run | 6 years before the seed run | inactive-account deletion demo |
| `inactive_demo_2` (`inactive2@example.com`) | `Demo1234!` | 9 years before the seed run | 7 years before the seed run | inactive-account deletion demo |
| `admin_demo` (`admin@example.com`), role **`admin`** | `Demo1234!` | 1 Oct 2026 08:30 UTC | time of the latest seed run | admin features (albums, flagged reviews, accounts) |

Every run sets the profile fields and `lastActivity` again, and writes every
account's `createdAt` again (fixed dates for the reviewers and admin,
backdated years for the inactive accounts). Running the seed after a demo puts the
inactive accounts back to inactive. (If they were deleted, it recreates them.)
It also sets `admin_demo`'s role back to `admin` if it was changed.

The seed never changes a password, including on accounts it updates. If
someone changes a demo account's password, re-running the seed won't put it
back to `Demo1234!`.
