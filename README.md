# FBFLIX Streaming

A modern, beautiful movie and TV series streaming platform built with vanilla HTML, CSS, and JavaScript.

## Features

- 🎬 Browse movies and TV series
- 🔍 Search functionality
- 📱 Fully responsive design
- 🌙 Modern dark theme with glassmorphism effects
- ⚡ Fast and lightweight
- 🔐 Admin dashboard for content management
- 📡 Supabase backend integration

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase
- **Hosting**: Cloudflare Pages

## Deployment

This site is designed to be deployed on Cloudflare Pages:

1. Push this repository to GitHub
2. Connect your GitHub repository to Cloudflare Pages
3. Set build settings:
   - Build command: (leave empty - static site)
   - Build output directory: `/` or `.`
4. Deploy!

## Environment Variables

For the admin dashboard and Supabase integration, you'll need to configure:
- Supabase URL
- Supabase Anon Key

These are configured in `config.js`.

## License

MIT License
