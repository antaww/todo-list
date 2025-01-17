# ✨ Svelte Todo List

A modern, reactive todo list application built with Svelte, TypeScript, and Supabase. Features real-time updates, multiple lists support, and a beautiful glassmorphism design.

## 🚀 Features

- ✅ Real-time updates with Supabase
- 📝 Multiple todo lists support
- 🎨 Modern glassmorphism UI design
- 🔄 Smooth animations and transitions
- ⚡ Optimistic updates for instant feedback
- 🔼 Task reordering with up/down arrows
- 📱 Fully responsive design

## 🛠️ Tech Stack

- [Svelte](https://svelte.dev/) - Frontend framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Supabase](https://supabase.com/) - Backend and real-time updates
- [Vite](https://vitejs.dev/) - Build tool
- [PNPM](https://pnpm.io/) - Package manager

## 🏗️ Project Structure

```
antaww-todo-list/
├── src/
│   ├── lib/
│   │   ├── TodoList.svelte    # Main todo list component
│   │   ├── supabase.ts        # Supabase client configuration
│   │   └── types.ts           # TypeScript interfaces
│   ├── App.svelte             # Root component
│   ├── app.css                # Global styles
│   └── main.ts                # Application entry point
└── supabase/                  # Supabase configuration and migrations
```

## 🚦 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/antaww-todo-list.git
cd antaww-todo-list
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
pnpm run dev
```

## 📝 Database Schema

### Todos Table
```sql
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  order INTEGER,
  list_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Lists Table
```sql
CREATE TABLE lists (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled List',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
