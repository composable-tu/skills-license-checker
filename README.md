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

| Option                      | Type      | Default         | Description                                     |
| --------------------------- | --------- | --------------- | ----------------------------------------------- |
| `--path`                    | `string`  | `process.cwd()` | Project root path to scan for skills            |
| `--format`                  | `string`  | `text`          | Output format: `text` or `json`                 |
| `--include-license-content` | `boolean` | `false`         | Include full license text in the `licenses` map |

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
License Content:
MIT License

Copyright (c) 2024 Jane Doe

Permission is hereby granted, free of charge, to any person obtaining a copy
...
---
```

JSON output:

```json
{
  "skills": [
    {
      "name": "my-skill",
      "description": "A helpful skill",
      "license": "MIT",
      "licenses": ["f1b3c2d4e5a6978b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7"],
      "author": "Jane Doe",
      "version": "1.0.0",
      "sourceUrl": "https://github.com/user/repo"
    }
  ],
  "licenses": {
    "f1b3c2d4e5a6978b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7": {
      "hash": "f1b3c2d4e5a6978b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7",
      "name": "MIT License",
      "spdxId": "MIT",
      "content": ""
    }
  }
}
```

Each skill's `licenses` is a list of license hashes. A hash is the SHA-256
digest of the license's full text, so identical text collapses into one shared
entry while distinct text under the same SPDX id stays separate. The top-level
`licenses` map keys every hash to its metadata, so SPDX expressions such as
`"Apache-2.0 OR MIT"` expand to every involved license. The `content` field
carries the full license text and is populated under `--include-license-content`.

JSON output with `--include-license-content`:

```json
{
  "skills": [
    {
      "name": "my-skill",
      "description": "A helpful skill",
      "license": "Apache-2.0",
      "licenses": [
        "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
        "f1b3c2d4e5a6978b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7"
      ],
      "author": "Jane Doe",
      "version": "1.0.0",
      "sourceUrl": "https://github.com/user/repo"
    }
  ],
  "licenses": {
    "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5": {
      "hash": "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "name": "Apache License 2.0",
      "spdxId": "Apache-2.0",
      "content": "Apache License\n..."
    },
    "f1b3c2d4e5a6978b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7": {
      "hash": "f1b3c2d4e5a6978b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7",
      "name": "MIT License",
      "spdxId": "MIT",
      "content": "MIT License\n..."
    }
  }
}
```

## Development

This project is a Vite+ project. Before developing it, please ensure that Vite+ is installed on your computer: https://viteplus.dev
