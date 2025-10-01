# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website for Francisco Contreras, a Product Marketing Manager. Built with Astro 4.x as a static site generator with Tailwind CSS for styling. The site showcases case studies, work highlights, and provides contact functionality.

**Site URL:** https://contrerasfrancisco.com

## Development Commands

```bash
# Start development server
npm run dev
# or
npm start

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Architecture

### Static Site Generation
- Built with Astro (static output mode)
- No server-side rendering or dynamic routes
- All pages are pre-rendered at build time

### Project Structure
```
src/
├── layouts/
│   └── Layout.astro          # Main layout with SEO, structured data, theme toggle
├── pages/
│   ├── index.astro           # Homepage
│   ├── contact.astro         # Contact page
│   ├── resources.astro       # Resources page
│   ├── writings.astro        # Writings page
│   └── case-studies/         # Case study pages
├── components/
│   ├── Navigation.astro      # Site navigation
│   ├── Footer.astro          # Site footer
│   ├── PersonalHero.astro    # Hero section
│   ├── ContactForm.astro     # Contact form with Cal.com integration
│   └── [other components]    # Reusable UI components
└── env.d.ts                  # TypeScript environment definitions

public/
├── logo/                     # SVG logos (animated and static)
├── images/                   # Profile images and tool icons
└── scripts/                  # Client-side scripts
```

### Layout System
- `Layout.astro` is the main layout wrapper used by all pages
- Contains comprehensive SEO metadata (OpenGraph, Twitter cards, JSON-LD structured data)
- Implements dark mode toggle functionality via localStorage
- Includes accessibility features (skip links, screen reader utilities)
- Inlines critical CSS for theme switching and dark mode colors

### Page Structure
Pages follow a component composition pattern:
```astro
import Layout from '../layouts/Layout.astro';
import Navigation from '../components/Navigation.astro';
import Footer from '../components/Footer.astro';

<Layout title="Page Title">
  <Navigation />
  <main id="main-content">
    <!-- Page components -->
  </main>
  <Footer />
</Layout>
```

### Styling Architecture

**Theme System:**
- Custom Tailwind configuration with extensive color system (`tailwind.config.mjs`)
- Light mode colors prefixed with `glass-` (e.g., `glass-bg`, `glass-gray-800`)
- Dark mode colors prefixed with `dark-glass-` (e.g., `dark-glass-bg`, `dark-glass-card`)
- Dark mode toggle via `dark` class on `<html>` element
- Theme persisted in localStorage

**Design System:**
- Glassmorphism aesthetic with backdrop blur effects
- Custom border radius values (`glass`, `glass-sm`, `glass-lg`, `glass-xl`)
- Custom box shadows (`glass`, `frost`, `soft`)
- Typography: Plus Jakarta Sans (sans) and Playfair Display (serif)
- Fonts loaded via Google Fonts with performance optimizations

**Dark Mode Implementation:**
- Background: `#050712` (enforced via inline styles to prevent flicker)
- Card background: `#0d122b`
- Theme toggle script in Layout.astro prevents flash of unstyled content
- Global `toggleTheme()` function available to all components

### Contact Form
- Located in `src/components/ContactForm.astro`
- Supports two variants: `full` (with form) and `cal-only` (just Cal.com embed)
- Uses Resend API for email sending (requires environment variables)
- Form validation handled client-side

### Environment Variables
Required for contact form functionality:
- `RESEND_API_KEY` - Resend API key for email sending
- `CONTACT_TO_EMAIL` - Recipient email address
- `CONTACT_FROM_EMAIL` - Sender email address

### SEO & Performance
- Comprehensive JSON-LD structured data in Layout.astro (Person, Organization, Service, WebSite schemas)
- OpenGraph and Twitter card meta tags
- Font loading optimized with `media="print"` + onload switch
- Preconnect hints for external resources (fonts, Cal.com)
- Image optimization with proper width/height attributes
- Performance CSS inlined in Layout.astro

### No TypeScript Configuration
- Project uses TypeScript for type checking via Astro's built-in support
- No separate `tsconfig.json` required
- Type definitions in `src/env.d.ts`

## Development Guidelines

### Adding New Pages
1. Create `.astro` file in `src/pages/` (filename becomes route)
2. Import and use `Layout.astro` wrapper
3. Include `Navigation` and `Footer` components
4. Set appropriate page title via Layout props

### Styling Conventions
- Use existing color system (`glass-*` for light, `dark-glass-*` for dark mode)
- Apply transition classes for smooth theme switching: `transition-colors duration-300`
- Use semantic spacing and component patterns from existing components
- Prefer glassmorphism effects: `backdrop-blur-xl`, `bg-glass-white/70`, border glass colors

### Component Development
- Components are self-contained `.astro` files
- Props interface defined in frontmatter
- No external component libraries (pure Astro + Tailwind)
- Interactive behavior via inline `<script>` tags in components

### Testing Changes
Always test both light and dark modes when making UI changes. The dark mode background color is critical and enforced via inline styles to prevent visual inconsistencies.
