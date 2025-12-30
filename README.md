# Claude Code Env Manager

你是不是也遇到过这样的场景：手头有好几个 API 服务商的 Key，官方的、Kimi 的、DeepSeek 的，每次想换一个试试都要手动改环境变量，改完还容易忘了改回来。

ccem 就是为了解决这个问题。一个命令切换环境，一个命令启动 Claude Code，API Key 加密存储，内置常用服务商配置。

![Demo](./index.png) 

## 安装

```bash
npm install -g claude-code-env-manager
```

或者用 pnpm

```bash
pnpm add -g claude-code-env-manager
```

不想装也行，直接 npx 跑

```bash
npx claude-code-env-manager
```

## 三分钟上手

装好之后，终端里敲 `ccem` 回车，你会看到一个交互式菜单。当前用的是哪个环境、Base URL 是什么、模型是哪个，一目了然。

想加一个新环境？

```bash
ccem add kimi
```

它会问你要不要用预设。选 KIMI，然后输入你的 API Key 就行了。URL 和模型名都帮你填好了。

切换环境更简单

```bash
ccem use kimi
```

或者直接在交互菜单里选。

![Demo](./demo.png) 


## 权限模式

Claude Code 的权限配置挺繁琐的。ccem 内置了几种常用模式，一键切换。

想放飞自我让 Claude 随便干？

```bash
ccem yolo
```

在不熟悉的代码库里想保守一点？

```bash
ccem safe
```

只想让它读代码做分析？

```bash
ccem audit
```

这些都是临时生效的，退出 Claude Code 之后自动还原。想永久设置的话用 `ccem setup perms --dev` 这种。

## Shell 集成

如果你希望 `ccem use` 之后环境变量立刻在当前终端生效，把下面这段加到你的 `~/.zshrc` 或 `~/.bashrc` 里

```bash
ccem() {
  command ccem "$@"
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    if [[ "$1" == "use" || -z "$1" ]]; then
      eval "$(command ccem env)"
    fi
  fi
  return $exit_code
}
```

然后 `source ~/.zshrc` 一下就好了。

## 内置预设

GLM（智谱 AI）、KIMI（月之暗面）、MiniMax、DeepSeek，这几个国内常用的都有。添加环境的时候选一下就行，省得自己查 URL 和模型名。

## License

MIT
