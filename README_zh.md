# Skills License Checker

现在的软件一般会带上“开放源代码许可”以声明使用的开源软件依赖，但是目前没有“开放技能许可”（Open Skill License）。因此我做了这个 JS 库，以帮助 JS/TS 开发者快速生成项目级使用的 Agent Skills 的相关信息。

> [!NOTE]
> 该库尚在开发中。

## 使用

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

## CLI 选项

| 选项                        | 类型      | 默认值          | 说明                               |
| --------------------------- | --------- | --------------- | ---------------------------------- |
| `--path`                    | `string`  | `process.cwd()` | 指定扫描 Skills 的项目根路径       |
| `--format`                  | `string`  | `text`          | 指定输出格式：`text` 或 `json`     |
| `--include-license-content` | `boolean` | `false`         | 在 `licenses` 映射中包含许可证全文 |

以文本输出（默认）：

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

带 `--include-license-content` 的文本输出：

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

以 JSON 输出：

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

每个 skill 的 `licenses` 是许可证哈希列表。哈希是许可证全文的 SHA-256 摘要，因此内容相同会合并为同一条目，而相同 SPDX id 下内容不同的许可证也会被保留为独立条目。顶层的 `licenses` 映射将每个哈希对应到其元数据，因此 SPDX 表达式（如 `"Apache-2.0 OR MIT"`）会展开为所涉及的全部许可证。`content` 字段承载许可证全文，仅在 `--include-license-content` 时填充。

带 `--include-license-content` 的 JSON 输出：

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

## 开发

此项目是一个 Vite+ 项目。在对该项目进行开发时，请先确保您的计算机安装了 Vite+：https://viteplus.dev
