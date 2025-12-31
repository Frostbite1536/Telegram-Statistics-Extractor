# Architecture

This document describes the architecture of the Telegram Statistics Extractor.

## Overview

The project extracts statistics from Telegram chat exports (JSON format) and visualizes them in an interactive HTML dashboard.

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│  Telegram JSON  │────▶│   stats.js  │────▶│  stats_*.json   │
│     Export      │     │  (Node.js)  │     │    (Output)     │
└─────────────────┘     └─────────────┘     └────────┬────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │   index.html    │
                                            │   (Chart.js)    │
                                            └─────────────────┘
```

## File Structure

```
├── stats.js          # Node.js script - extracts statistics
├── index.html        # Browser visualization - displays charts
├── ARCHITECTURE.md   # This file
└── README.md         # User documentation
```

## stats.js - Statistics Extractor

### Module Organization

The script follows a modular architecture with four sections:

```
┌─────────────────────────────────────────────────────────────┐
│                      CONFIGURATION                          │
│  - INPUT_FILE_PATH, OUTPUT_DIR_PATH, TOP_USERS_LIMIT       │
├─────────────────────────────────────────────────────────────┤
│                    UTILITY FUNCTIONS                        │
│  - incrementCounter()  - formatDate()  - formatMonth()     │
│  - generateTimestamp() - getTopEntries() - findPeak()      │
│  - extractTextContent() - extractEmojis() - isValidDate()  │
├─────────────────────────────────────────────────────────────┤
│                  STAT CALCULATOR MODULES                    │
│  Each module is a pure function: (messages) → statistics   │
├─────────────────────────────────────────────────────────────┤
│                     MAIN EXECUTION                          │
│  - Orchestrates all calculations                           │
│  - Assembles final stats object                            │
│  - Writes output JSON                                       │
└─────────────────────────────────────────────────────────────┘
```

### Calculator Modules

| Module | Function | Input | Output |
|--------|----------|-------|--------|
| **Basic Stats** | `calculateBasicStats()` | messages, dailyActivity | totalMessages, totalUsers, averages |
| **Daily Activity** | `calculateDailyActivity()` | messages | `{ "YYYY-M-D": count }` |
| **Monthly Activity** | `calculateMonthlyActivity()` | messages | `{ "YYYY-MM": count }` |
| **User Activity** | `calculateUserActivity()` | messages | top users + percentages |
| **Active Hours** | `calculateActiveHours()` | messages | `{ hour: count }` (0-23) |
| **Active Days** | `calculateActiveDays()` | messages | `{ weekday: count }` (0-6) |
| **Peaks** | `calculatePeaks()` | daily, hours, monthly | peak day/hour/month |
| **Streaks** | `calculateActivityStreaks()` | dailyActivity | longest consecutive days |
| **User Timeline** | `calculateUserTimeline()` | messages | first/last seen per user |
| **Media Types** | `calculateMediaTypes()` | messages | `{ type: count }` |
| **Message Length** | `calculateMessageLengthStats()` | messages | avg, median, distribution |
| **Emoji Stats** | `calculateEmojiStats()` | messages | top emojis, counts |
| **Reply Chains** | `calculateReplyChains()` | messages | replies, forwards, top repliers |

### Data Flow

```
messages[] ──┬──▶ calculateDailyActivity() ──────────────────────┐
             ├──▶ calculateMonthlyActivity() ────────────────────┤
             ├──▶ calculateUserActivity() ───────────────────────┤
             ├──▶ calculateActiveHours() ────────────────────────┤
             ├──▶ calculateActiveDays() ─────────────────────────┤
             ├──▶ calculateUserTimeline() ───────────────────────┤
             ├──▶ calculateMediaTypes() ─────────────────────────┼──▶ stats{}
             ├──▶ calculateMessageLengthStats() ─────────────────┤
             ├──▶ calculateEmojiStats() ─────────────────────────┤
             └──▶ calculateReplyChains() ────────────────────────┤
                                                                  │
dailyActivity ──┬──▶ calculateBasicStats() ──────────────────────┤
                ├──▶ calculatePeaks() ───────────────────────────┤
                └──▶ calculateActivityStreaks() ─────────────────┘
```

## index.html - Visualization Dashboard

### Module Organization

```
┌─────────────────────────────────────────────────────────────┐
│                      CONFIGURATION                          │
│  - STATS_FILE, DAY_NAMES, COLORS                           │
├─────────────────────────────────────────────────────────────┤
│                    UTILITY FUNCTIONS                        │
│  - convertDaysToNames() - formatNumber() - escapeHtml()    │
│  - createSummaryCard()                                      │
├─────────────────────────────────────────────────────────────┤
│                  CHART CREATION FUNCTIONS                   │
│  - createLineChart() - createBarChart()                    │
│  - createHorizontalBarChart() - createDoughnutChart()      │
├─────────────────────────────────────────────────────────────┤
│                    SECTION RENDERERS                        │
│  - renderSummary() - renderUserTable()                     │
│  - renderEmojiStats() - renderEngagementStats()            │
├─────────────────────────────────────────────────────────────┤
│                    MAIN INITIALIZATION                      │
│  - fetch() stats file                                       │
│  - Call renderers and chart creators                       │
└─────────────────────────────────────────────────────────────┘
```

### UI Sections

| Section | Charts/Components | Data Source |
|---------|-------------------|-------------|
| **Overview** | Summary cards, peaks highlight | `summary`, `peaks`, `streaks` |
| **Activity Over Time** | Daily line, monthly line, hours line, weekday bar | `dailyActivity`, `monthlyActivity`, `activeHours`, `activeDays` |
| **User Activity** | Horizontal bar chart, details table | `userActivity`, `userActivityWithPercentage`, `userTimeline` |
| **Content Analysis** | Media doughnut, length bar, emoji grid | `mediaTypes`, `messageLengthStats`, `emojiStats` |
| **Engagement** | Reply doughnut, stats text | `replyChains` |

## Output JSON Schema

```javascript
{
  // Basic Statistics
  "summary": {
    "totalMessages": number,
    "totalUsers": number,
    "totalDays": number,
    "averageMessagesPerDay": number,
    "averageMessagesPerUser": number,
    "generatedAt": string  // ISO timestamp
  },

  // Temporal Statistics
  "dailyActivity": { "YYYY-M-D": number },
  "monthlyActivity": { "YYYY-MM": number },
  "activeHours": { "0-23": number },
  "activeDays": { "0-6": number },  // 0=Sunday
  "peaks": {
    "peakDay": { "date": string, "messages": number },
    "peakHour": { "hour": number, "messages": number },
    "peakMonth": { "month": string, "messages": number }
  },
  "streaks": {
    "longestStreak": number,
    "streakStart": string,
    "streakEnd": string
  },

  // User Statistics
  "userActivity": { "username": number },  // top 20
  "userActivityWithPercentage": {
    "username": { "count": number, "percentage": number }
  },
  "userTimeline": {
    "username": {
      "firstSeen": string,
      "lastSeen": string,
      "messageCount": number,
      "activeDays": number
    }
  },

  // Content Statistics
  "mediaTypes": { "type": number },
  "messageLengthStats": {
    "averageLength": number,
    "medianLength": number,
    "minLength": number,
    "maxLength": number,
    "lengthDistribution": { "category": number }
  },
  "emojiStats": {
    "totalEmojis": number,
    "uniqueEmojis": number,
    "messagesWithEmojis": number,
    "topEmojis": { "emoji": number }
  },

  // Advanced Statistics
  "replyChains": {
    "totalReplies": number,
    "totalForwards": number,
    "replyPercentage": number,
    "topRepliers": { "username": number }
  }
}
```

## Telegram Export Format

The script expects Telegram Desktop's JSON export format:

```javascript
{
  "messages": [
    {
      "date": "2023-01-15T14:30:45",  // ISO format
      "from": "username",              // sender name
      "text": "message" | [...],       // string or array of parts
      "reply_to_message_id": number,   // optional
      "forwarded_from": string,        // optional
      "photo": string,                 // optional - photo path
      "media_type": string,            // optional - "sticker", "voice_message", etc.
      "file": string,                  // optional - file path
      "poll": object,                  // optional
      "location_information": object,  // optional
      "contact_information": object    // optional
    }
  ]
}
```

## Security Considerations

- **XSS Prevention**: All user-provided content (usernames, dates) is escaped via `escapeHtml()` before DOM insertion
- **Input Validation**: Invalid dates are filtered out via `isValidDate()`
- **Null Safety**: All display functions handle null/undefined values gracefully

## Adding New Statistics

1. Create a new calculator function in stats.js:
   ```javascript
   function calculateNewStat(messages) {
       // Process messages
       return { /* stat data */ };
   }
   ```

2. Call it in `main()` and add to stats object:
   ```javascript
   const newStat = calculateNewStat(messages);
   const stats = { ..., newStat };
   ```

3. Add visualization in index.html:
   ```javascript
   function renderNewStat(stats) {
       // Create chart or display data
   }
   ```

4. Call renderer in the fetch callback:
   ```javascript
   renderNewStat(stats);
   ```
