# Contributing to OCR MVP

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- For iOS development: Xcode 15+ and CocoaPods
- For Android development: Android Studio and JDK 17

### Running the Project

```bash
# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
```

## Code Style

- Follow the existing code style and conventions
- Use TypeScript for all new code
- Run the linter before committing: `npm run lint`
- Ensure TypeScript compiles without errors: `npm run typecheck`

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb in imperative mood (e.g., "Add", "Fix", "Update")
- Keep the subject line under 70 characters
- Reference issue numbers when applicable (e.g., "Fix #123")

## Pull Requests

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the README if adding new features
5. Keep PRs focused on a single change

## Reporting Issues

- Use the GitHub issue tracker
- Include steps to reproduce the issue
- Provide your environment details (OS, Node version, Expo version)
- Include screenshots if applicable

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
