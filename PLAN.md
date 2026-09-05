# Budget Board - Project Plan

A Trello-inspired personal cash flow management app with AI-native input. Users describe expenses and income in natural language, and the AI creates cards on a kanban board. Drag-and-drop to track payment status.

---

## Tech Stack

| Layer       | Choice                        |
| ----------- | ----------------------------- |
| Framework   | TanStack Start                |
| AI          | TanStack AI + Durable Streams |
| AI Provider | Google Gemini                 |
| Database    | Convex                        |
| Auth        | BetterAuth (Google OAuth)     |
| Drag & Drop | dnd-kit                       |
| Styling     | Tailwind CSS v4               |
| Components  | shadcn/ui (light/dark mode)   |
| Validation  | Zod v4                        |

---

## Board Structure

### Swimlane: Expenses

| Upcoming | Due | Paid |
| -------- | --- | ---- |

### Swimlane: Income

| Expected | Received |
| -------- | -------- |

- Rolling view with user-configurable time horizon
- Toggle to show/hide completed items
- Light/dark mode support

---

## Card Data Model

| Field       | Type       | Description                                  |
| ----------- | ---------- | -------------------------------------------- |
| id          | string     | Unique identifier                            |
| type        | enum       | `income` \| `expense`                        |
| amount      | number     | Dollar amount                                |
| description | string     | What the card is for                         |
| date        | date       | Due date / expected date                     |
| category    | string     | Predefined + user-defined categories         |
| priority    | enum       | `low` \| `medium` \| `high`                  |
| recurring   | boolean    | Badge indicator, manual re-creation          |
| source      | string     | Payee or payer (e.g., "Netflix", "Employer") |
| status      | enum       | Column position                              |
| createdAt   | timestamp  | When card was created                        |
| completedAt | timestamp? | When marked paid/received                    |

---

## AI Capabilities

### Card Creation (Natural Language)

- "Rent $1200 due on the 15th"
- "Netflix $15 monthly subscription"
- "Getting paid $2400 next Friday"
- "Owe Mike $50 for dinner"

### Card Editing (Natural Language)

- "Change rent to $1300"
- "Move Netflix to due"
- "Mark electric bill as paid"

### Queries

- "How much do I owe this week?"
- "What's my balance after bills?"
- "Show me all subscriptions"
- "What's overdue?"

### AI Tool Functions

```typescript
// Card management
createCard({ type, amount, description, date, category, priority, recurring, source })
updateCard({ id, ...fields })
deleteCard({ id })
moveCard({ id, status })

// Queries
queryBalance({ timeframe? })
listCards({ filters })

// Suggestions
suggestCategory({ description })
```

---

## Info Bar / Stats

- Total upcoming expenses
- Total expected income
- Net balance (income - expenses)
- Overdue count
- Due soon count

---

## Notifications & Reminders

- In-app notification system
- Visual indicators on cards:
  - Overdue: red border/badge
  - Due soon: warning styling
  - Priority indicators

---

## Authentication & Persistence

- **BetterAuth** with Google OAuth
- **Convex** for real-time database
  - Live updates when cards change
  - Reactive queries for stats

---

## UI/UX Features

- **Responsive web design** (mobile-friendly)
- **Light/dark mode** toggle
- **Drag and drop** with dnd-kit
  - Drag cards between columns
  - Drag to reorder within columns
- **AI sidebar** for natural language input
- **Direct edit UI** for cards (click to edit)
- **Durable streams** for reliable AI responses (handles connection drops)

---

## Categories (Predefined Suggestions)

### Expenses

- Rent/Mortgage
- Utilities
- Groceries
- Subscriptions
- Transportation
- Insurance
- Healthcare
- Entertainment
- Dining
- Shopping
- Debt Payment
- Other

### Income

- Salary
- Freelance
- Refund
- Gift
- Investment
- Other

Users can also create custom categories.

---

## Future Considerations (Post-V1)

- Recurring card auto-generation
- Email/push notifications
- Budget goals and tracking
- Spending insights and trends
- Export to CSV
- Multi-board support (different accounts)
- Shared boards (couples/roommates)
