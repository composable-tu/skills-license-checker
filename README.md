# Skills License Checker

Software today typically includes an "Open Source License" to declare dependencies on open-source software, yet there is currently no "Open Skill License." I therefore created this JS library to help JS/TS developers quickly generate information regarding Agent Skills for use at the project level.

> [!NOTE]
> This library is still under development.

## Use

> npm

```zsh
npx skills-license-checker
```

> [pnpm](https://pnpm.io)

```zsh
pnpm dlx skills-license-checker
```

> [Yarn](https://yarnpkg.com)

```zsh
yarn dlx skills-license-checker
```

> [vlt](https://www.vlt.io)

```zsh
vlx skills-license-checker
```

> [Bun](https://bun.sh)

```zsh
bunx skills-license-checker
```

> [Vite+](https://viteplus.dev)

```zsh
vpx skills-license-checker
```

## CLI Options

| Option                      | Type      | Default         | Description                                 |
| --------------------------- | --------- | --------------- | ------------------------------------------- |
| `--path`                    | `string`  | `process.cwd()` | Project root path to scan for skills        |
| `--format`                  | `string`  | `text`          | Output format: `text` or `json`             |
| `--include-license-content` | `boolean` | `false`         | Include full license file content in output |

Text output (default):

```
Found 2 skill(s) in /path/to/project
---
Name: my-skill
Description: A helpful skill
License: MIT
Author: Jane Doe
Version: 1.0.0
Source: https://github.com/user/repo
---
```

Text output with `--include-license-content`:

```
Found 1 skill(s) in /path/to/project
---
Name: my-skill
Description: A helpful skill
License: MIT
License Content: MIT License

Copyright (c) 2024 Jane Doe

Permission is hereby granted, free of charge, to any person obtaining a copy
...
---
```

JSON output:

```json
[
  {
    "name": "my-skill",
    "description": "A helpful skill",
    "license": "MIT",
    "author": "Jane Doe",
    "version": "1.0.0",
    "sourceUrl": "https://github.com/user/repo"
  }
]
```

JSON output with `--include-license-content`:

```json
[
  {
    "name": "my-skill",
    "description": "A helpful skill",
    "license": "MIT",
    "author": "Jane Doe",
    "version": "1.0.0",
    "sourceUrl": "https://github.com/user/repo",
    "licenseContent": "MIT License\n\nCopyright (c) 2024 Jane Doe\n\nPermission is hereby granted, free of charge, to any person obtaining a copy..."
  }
]
```

## Development

This project is a Vite+ project. Before developing it, please ensure that Vite+ is installed on your computer: https://viteplus.dev
