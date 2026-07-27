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

| 选项       | 类型     | 默认值          | 说明                           |
|------------|----------|-----------------|--------------------------------|
| `--path`   | `string` | `process.cwd()` | 指定扫描 Skills 的项目根路径   |
| `--format` | `string` | `text`          | 指定输出格式：`text` 或 `json` |

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

以 JSON 输出：

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

## 开发

此项目是一个 Vite+ 项目。在对该项目进行开发时，请先确保您的计算机安装了 Vite+：https://viteplus.dev
