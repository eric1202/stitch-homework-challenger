# Homework Hero (作业小英雄) 🚀

Homework Hero is a premium, offline-first homework management application designed to help students track tasks, earn rewards, and visualize their learning progress.

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

## ✨ Key Features

- **✅ Task Management**: Effortlessly add, complete, and track daily homework tasks across different subjects (Math, English, Science, etc.).
- **🏆 Gamified Rewards**: Earn points for every task completed. Watch your "Hero Points" grow as you achieve your goals.
- **📊 Dynamic Analytics**: Interactive charts powered by Chart.js to visualize your weekly activity and progress trends.
- **🌐 Dual Language Support**: Full internationalization for both English and Simplified Chinese (简体中文).
- **💾 Offline-First**: Powered by Dexie.js (IndexedDB), ensuring your data is always available even without an internet connection.
- **📥 Data Portability**: 
  - Export task history to CSV for academic reporting.
  - Secure JSON backup and restore functionality to keep your data safe.
- **📱 Responsive & Premium UI**: A modern, sleek design that works beautifully on both desktop and mobile devices.

## 🛠 Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Charts**: [Chart.js](https://www.chartjs.org/) with [vue-chartjs](https://vue-chartjs.org/)
- **I18n**: [Vue I18n](https://vue-i18n.intlify.dev/)
- **Icons**: [Heroicons](https://heroicons.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd homework-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## 📂 Project Structure

- `src/components/`: UI screens (Home, Analytics, Settings).
- `src/db.js`: Database schema and configuration.
- Shared localization strings now live in `../packages/shared/locales.js`.
- `src/utils/`: Helper functions for date formatting and CSV export.

---

Made with ❤️ by [Your Name/Team]
