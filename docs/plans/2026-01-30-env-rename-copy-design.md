# 环境重命名与复制功能设计

## 概述

为 ccem 添加两个新命令，优化环境配置的维护体验：
- `ccem rename <old> <new>` - 重命名环境
- `ccem cp <source> <target>` - 复制环境（可选微调配置）

## 命令设计

### 1. `ccem rename <old> <new>`

**功能**：将环境重命名，保留所有配置不变。

**流程**：
1. 验证 `<old>` 存在
2. 验证 `<new>` 不存在
3. 验证 `<old>` 不是 `official`
4. 复制配置到新名字，删除旧名字
5. 如果 `current` 指向 `<old>`，更新为 `<new>`
6. 输出成功信息

**错误处理**：
- `<old>` 不存在 → `Environment '<old>' not found.`
- `<new>` 已存在 → `Environment '<new>' already exists.`
- `<old>` 是 `official` → `Cannot rename default 'official' environment.`

### 2. `ccem cp <source> <target>`

**功能**：复制环境配置到新环境，复制后可选编辑。

**流程**：
1. 验证 `<source>` 存在
2. 验证 `<target>` 不存在
3. 复制配置到 `<target>`
4. 输出成功信息
5. 询问"Do you want to modify the configuration?"
6. 如果用户选择是，进入编辑流程：
   - 逐项显示当前值（URL、API Key、Model、Small Model）
   - 用户可直接回车保留原值，或输入新值
   - API Key 显示为 masked（`****`），输入时用 password 类型

**错误处理**：
- `<source>` 不存在 → `Environment '<source>' not found.`
- `<target>` 已存在 → `Environment '<target>' already exists.`

## 实现位置

在 `src/index.ts` 中添加两个命令，位于现有 `del` 命令之后。

## 代码变更

### 添加 rename 命令（约 25 行）

```typescript
program
  .command('rename <old> <new>')
  .description('Rename an environment configuration')
  .action((oldName, newName) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;

    if (!registries[oldName]) {
      console.log(chalk.red(`Environment '${oldName}' not found.`));
      return;
    }

    if (registries[newName]) {
      console.log(chalk.red(`Environment '${newName}' already exists.`));
      return;
    }

    if (oldName === 'official') {
      console.log(chalk.red(`Cannot rename default 'official' environment.`));
      return;
    }

    registries[newName] = registries[oldName];
    delete registries[oldName];
    config.set('registries', registries);

    const current = config.get('current');
    if (current === oldName) {
      config.set('current', newName);
    }

    console.log(chalk.green(`Environment '${oldName}' renamed to '${newName}'.`));
  });
```

### 添加 cp 命令（约 60 行）

```typescript
program
  .command('cp <source> <target>')
  .description('Copy an environment configuration')
  .action(async (source, target) => {
    const registries = config.get('registries') as Record<string, EnvConfig>;

    if (!registries[source]) {
      console.log(chalk.red(`Environment '${source}' not found.`));
      return;
    }

    if (registries[target]) {
      console.log(chalk.red(`Environment '${target}' already exists.`));
      return;
    }

    registries[target] = { ...registries[source] };
    config.set('registries', registries);
    console.log(chalk.green(`Environment '${source}' copied to '${target}'.`));

    const { modify } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'modify',
        message: 'Do you want to modify the configuration?',
        default: false
      }
    ]);

    if (modify) {
      const current = registries[target];
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'ANTHROPIC_BASE_URL',
          message: 'ANTHROPIC_BASE_URL:',
          default: current.ANTHROPIC_BASE_URL
        },
        {
          type: 'password',
          name: 'ANTHROPIC_API_KEY',
          message: 'ANTHROPIC_API_KEY (leave empty to keep current):',
        },
        {
          type: 'input',
          name: 'ANTHROPIC_MODEL',
          message: 'ANTHROPIC_MODEL:',
          default: current.ANTHROPIC_MODEL
        },
        {
          type: 'input',
          name: 'ANTHROPIC_SMALL_FAST_MODEL',
          message: 'ANTHROPIC_SMALL_FAST_MODEL:',
          default: current.ANTHROPIC_SMALL_FAST_MODEL
        }
      ]);

      if (answers.ANTHROPIC_BASE_URL) current.ANTHROPIC_BASE_URL = answers.ANTHROPIC_BASE_URL;
      if (answers.ANTHROPIC_API_KEY) current.ANTHROPIC_API_KEY = encrypt(answers.ANTHROPIC_API_KEY);
      if (answers.ANTHROPIC_MODEL) current.ANTHROPIC_MODEL = answers.ANTHROPIC_MODEL;
      if (answers.ANTHROPIC_SMALL_FAST_MODEL) current.ANTHROPIC_SMALL_FAST_MODEL = answers.ANTHROPIC_SMALL_FAST_MODEL;

      registries[target] = current;
      config.set('registries', registries);
      console.log(chalk.green(`Environment '${target}' updated.`));
    }
  });
```

## 测试场景

### rename 命令
- [x] 正常重命名
- [x] 重命名当前使用的环境（current 自动更新）
- [x] 源环境不存在
- [x] 目标名已存在
- [x] 尝试重命名 official

### cp 命令
- [x] 正常复制，不修改
- [x] 正常复制，修改配置
- [x] 源环境不存在
- [x] 目标名已存在
- [x] 修改时保留原 API Key（留空）
- [x] 修改时更新 API Key
