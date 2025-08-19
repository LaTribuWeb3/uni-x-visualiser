# Uni-X Visualizer

A React + TypeScript + Vite application for visualizing and managing transaction data with price enrichment capabilities.

## Features

- **Dashboard**: View transaction statistics and analytics
- **File Upload**: Upload CSV files with real-time progress tracking
- **Transactions Table**: Browse and filter transaction data
- **Price Enrichment**: Automated price data enrichment for transactions
- **Standalone Enrichment Daemon**: Generate standalone executables for VM deployment

## Development

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Standalone Enrichment Daemon

The project includes scripts to generate standalone executables for the price enrichment daemon that can be deployed on VMs without requiring Node.js installation.

### Available Scripts

- `npm run build-enrichment`: Compiles the TypeScript enrichment script to JavaScript
- `npm run clean-enrichment`: Cleans the build artifacts
- `npm run package-enrichment`: Generates standalone executables for multiple platforms

### Generating Standalone Executables

To create standalone executables for VM deployment:

```bash
npm run package-enrichment
```

This will generate the following files in `dist/executables/`:
- `enrichment-daemon-win.exe` (Windows x64)
- `enrichment-daemon-linux` (Linux x64)
- `enrichment-daemon-macos` (macOS x64)

### Deployment

1. Copy the appropriate executable to your VM
2. Create a `.env` file with your configuration:
   ```
   MONGODB_URI=mongodb://your-mongodb-connection
   DB_NAME=uni-x-visualiser
   COLLECTION_NAME=transactions
   ```
3. Run the executable:
   ```bash
   # Linux/macOS
   ./enrichment-daemon-linux
   
   # Windows
   enrichment-daemon-win.exe
   ```

The daemon will run continuously, enriching transaction prices every 10 minutes.
