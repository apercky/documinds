# Documinds

A modern, AI-powered document search and chat interface built with Next.js 14, featuring a beautiful UI powered by shadcn/ui and Tailwind CSS.

![Documinds Logo](/public/logo.svg)

## Features

- 🎨 Modern and responsive UI with dark/light mode support
- 🌍 Internationalization support (English and Italian)
- 💬 AI-powered chat interface with markdown support
- 📱 Collapsible sidebar for better mobile experience
- 🔍 Advanced document search capabilities
- 🎯 Real-time chat with code highlighting
- 🔒 Secure and private document handling

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Hooks
- **Markdown**: react-markdown with syntax highlighting
- **Icons**: Lucide Icons
- **Animations**: Framer Motion
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/documinds.git
cd documinds
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your environment variables:
```env
# Your environment variables here
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
documinds/
├── app/                   # Next.js app directory
│   ├── [locale]/         # Internationalized routes
│   └── api/              # API routes
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   └── layout/          # Layout components
├── lib/                 # Utility functions
├── public/              # Static assets
├── styles/             # Global styles
└── messages/           # i18n messages
```

## Key Components

- **Chat Interface**: Real-time chat with AI, featuring markdown support and code highlighting
- **Sidebar Navigation**: Collapsible sidebar with project navigation and user settings
- **Internationalization**: Built-in support for multiple languages
- **Theme Switcher**: Dynamic dark/light mode switching
- **Document Viewer**: Advanced document viewing capabilities

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Next.js](https://nextjs.org/) for the amazing framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Lucide Icons](https://lucide.dev/) for the beautiful icons

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using Next.js and shadcn/ui
