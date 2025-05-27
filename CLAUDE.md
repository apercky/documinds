# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Development: `npm run dev`
- Build: `npm run build`
- Production start: `npm run start:prod`
- Lint: `npm run lint`

## Code Style
- TypeScript with strict type checking
- React 19 & Next.js 15 with App Router
- Favor React Server Components (RSC) where possible
- Minimize 'use client' directives
- Use functional and declarative programming patterns
- Follow DRY principle
- Structure components logically: exports, subcomponents, helpers, types

## Naming Conventions
- Use descriptive names with auxiliary verbs (isLoading, hasError)
- Prefix event handlers with "handle" (handleClick, handleSubmit)
- Use lowercase with dashes for directories (components/auth-wizard)

## Error Handling
- Implement comprehensive error handling with proper types
- Use next-intl for i18n localization
- Implement proper error boundaries

## Type Safety
- Use TypeScript for all code
- Prefer interfaces over types
- Avoid enums; use const maps instead
- Implement proper type safety and inference