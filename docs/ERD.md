# Cozy Dates Data Model

```mermaid
erDiagram
    USER {
        string id PK
        string name
    }
    TASK {
        string id PK
        string title
        string description
        datetime date
        string category
        string priority
        boolean completed
        string notes
    }
    WATCHLIST_ITEM {
        string id PK
        string title
        string type
        string status
        string notes
    }
    MUSIC_NOTE {
        string id PK
        string title
        string notes
        string playlistUrl
    }
    USER ||--o{ TASK : creates
    USER ||--o{ WATCHLIST_ITEM : adds
    USER ||--o{ MUSIC_NOTE : adds
    WATCHLIST_ITEM ||--|{ TASK : "movie plan"
```

This diagram represents the planned database if tasks, watchlist items and music notes were stored in a relational database. Currently the project persists these elements in the browser's `localStorage`.
