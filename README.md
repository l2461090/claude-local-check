# Claude 环境检测

本地运行的浏览器环境检测工具，可直接启动，也可安装为 Codex Skill。无广告、无统计，默认检测无需联网，结果不上传。

## 如何使用

1. 从 [Releases](https://github.com/l2461090/claude-local-check/releases/latest) 下载 `claude-local-check-v1.0.0.zip`。
2. 解压完整文件夹。需要 **Python 3.8+** 和现代桌面浏览器，无需 API Key、账号、Node.js 或第三方 Python 包。
3. 按系统运行启动文件：

| 系统 | 启动文件 |
| --- | --- |
| macOS | `launch-mac.command` |
| Windows | `launch-windows.cmd` |
| Linux | `launch-linux.sh` |

如果系统未直接运行文件，可在解压目录的终端执行：

```bash
python3 scripts/local_check.py start --open
```

Windows 可用 `py -3 scripts/local_check.py start --open`。若缺少 Python，可安装 Python 3.8+，或让本地 AI 助手寻找宿主自带的 Python。

打开网页后点击「开始检测」。检测的是当前打开页面的浏览器；平时在哪个浏览器使用 Claude，就将输出地址粘贴到那个浏览器。

每台电脑需要运行自己的副本。服务仅监听本机 `127.0.0.1`；默认尝试端口 4321，冲突时自动选择可用端口，以启动命令输出为准。

## 作为 Skill 安装

将 ZIP 交给有本地文件与终端能力的 Codex，并发送：

> 请将 claude-local-check 安装为本地 Skill，然后打开 Claude 环境检测。

手动安装时将完整文件夹放到 `~/.codex/skills/claude-local-check`；配置了 `CODEX_HOME` 时使用其 `skills/` 目录。已有版本请先备份，避免旧文件混入。

安装后可直接说：

> 使用 $claude-local-check 打开本地环境检测。

仅把文件上传给没有本地执行工具的聊天网页，不会启动你电脑上的服务。

## 评级规则

| 已测分数 | 评级 | 结论文案 |
| --- | --- | --- |
| 0–30 | 低风险 | 🐶你不是「Claude 中国用户」🐶 |
| 31–60 | 中等风险 | 🐶你可能是「Claude 中国用户」🐶 |
| 61–100 | 高风险 | 🐶你绝对是「Claude 中国用户」🐶 |

未检测项会标记，并列出可能的完整分数范围。当前结论按已测分数给出；全部项目无法检测时显示“未获取到有效检测结果”。

这是一套浏览器特征的启发式评分，不代表 Claude 官方判断、账号使用资格或封号概率。本项目与 Anthropic 无隶属关系。

## 检测项目

| 项目 | 权重 | 本版规则 |
| --- | --- | --- |
| 系统时区 | 24 | 匹配中国大陆时区名称 |
| 浏览器语言 | 18 | 简体中文标签为强信号，其他中文标签或非首选语言权重较低 |
| 中文字体 | 14 | 通过 Canvas 字宽变化检测指定字体 |
| 厂商字体 | 10 | 检测指定的手机厂商字体 |
| WebRTC 地址暴露 | 10 | 主动启用后检查是否出现数字 IP 候选地址 |
| 浏览器标识 | 8 | 匹配 User-Agent 中的浏览器名称 |
| 设备标识 | 6 | 匹配 User-Agent 中的设备厂商名称 |
| 区域格式 | 4 | 读取 Intl 的区域格式 |
| 时区偏移 | 3 | UTC+8 为匹配信号 |
| 操作系统标识 | 3 | 根据 User-Agent 作弱权重补充 |

各项目匹配程度为 0–1，乘以权重后逐项四舍五入相加。源码位于 `assets/site/model.js` 与 `assets/site/checks.js`。

语言、字体和 UTC+8 也存在于其他地区，浏览器可能隐藏或改变标识，字体探测也可能误判，因此分数不能确定用户所在地。WebRTC 只反映地址暴露，不识别 IP 所属国家。

## 隐私与运行

- 默认检查不连接外部服务，结果只保留在浏览器内存中；刷新页面即清除。
- WebRTC 默认关闭。主动勾选后会连接 Google 公共 STUN，网络检测存在外部通信。
- 保存图片在本地 Canvas 中生成，由浏览器下载，无需上传。
- 不读取账号信息，不修改系统设置，不安装扩展。
- 启动器临时目录保存服务状态与错误日志，不保存检测结果。

```bash
python3 scripts/local_check.py status
python3 scripts/local_check.py stop
```

无法保持后台进程时，使用 `python3 scripts/local_check.py serve` 并保持终端开启。

## 开发与打包

页面使用可直接编辑的 HTML、CSS 和 JavaScript，无框架、无外部前端依赖、无需编译。`scripts/local_check.py` 使用 Python 标准库。主页面源码为 `assets/site/index.html`，打包时自动同步至 `/zh/` 入口。

修改后执行：

```bash
python3 scripts/package.py
python3 tests/test_launcher.py
```

打包脚本更新资源哈希，并在 `dist/` 生成 ZIP 和 SHA-256 校验文件。资源哈希检查用于发现损坏或安装不完整，不是数字签名。可选使用 Node.js 22+ 执行 `node --test tests/scoring.test.js` 验证评级逻辑。

已在 macOS 验证；提供 Windows 与 Linux 启动入口，尚未完成对应系统的手动实机验证。

## 作者与许可

作者与维护者：[l2461090](https://github.com/l2461090)。

Copyright (c) 2026 l2461090。采用 [MIT 许可](LICENSE)。
