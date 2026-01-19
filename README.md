# tg-channel-service

### Description
Telegram bot for creating reminders from free-form text input.
Natural language is parsed into a structured reminder format and stored locally.

### Scope
- Telegram bot interaction
- Free-text reminder input
- Reminder parsing via LLM
- JSON-based reminder configuration
- Local persistence of reminders
- Scheduling based on parsed data

### Reminder Format
LLM output format (JSON only):

```json
{
  "repeat": "none|daily|weekly|monthly|yearly",
  "interval": number | null,
  "weekdays": ["mon","tue","wed","thu","fri","sat","sun"] | null,
  "time": "HH:mm:ss",
  "timezone": "UTC+4",
  "next_date": "DD.MM.YYYY" | null
}
```

### Tech

* TypeScript
* Telegram API (gram.js)
* SQLite
* Drizzle ORM
* OpenAI API

### Notes

* Originally developed as a standalone service
* Later reused as a personal Telegram bot
* SQLite used as local storage
