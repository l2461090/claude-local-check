# Claude 环境检测

本地运行的浏览器环境检测工具，可直接启动，也可安装为 Codex Skill。无广告、无统计，结果不上传。WebRTC 默认开启，点击检测后会连接 Google 公共 STUN；可手动关闭此项进行离线检测。

## 如何使用

1. 从 [Releases](https://github.com/l2461090/claude-local-check/releases/latest) 下载 `claude-local-check-v1.0.2.zip`。
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

检测完成后，结果卡先汇总“命中的信号”，按检测顺序展示匹配程度达到 25% 的项目名称和分值；保存的结果图片也包含同样的汇总。匹配程度低于 25% 的项目可能仍贡献少量分数，但不进入命中标签；全部计分可在明细中查看。

未检测项会标记，并列出可能的完整分数范围。当前结论按已测分数给出；全部项目无法检测时显示“未获取到有效检测结果”。

这是一套浏览器特征的启发式评分，不代表 Claude 官方判断、账号使用资格或封号概率。本项目与 Anthropic 无隶属关系。

## 检测项目

| 项目 | 权重 | 本版规则 |
| --- | --- | --- |
| 系统时区 | 24 | 大陆时区匹配程度 1；香港、澳门 0.6；台湾 0 |
| 浏览器语言 | 18 | 台湾繁体及其尾随 zh 回退不加分；简体首选 1、非首选 0.7；香港/澳门及通用繁体首选 0.5 |
| 中文字体 | 14 | 72px Canvas 字宽差大于 0.5；简体字体匹配程度 min(1, 0.75 + 0.08 × 数量)，仅繁体为 0.2 |
| 厂商字体 | 10 | 命中一种匹配程度 0.8，两种及以上为 1 |
| WebRTC IP 泄露 | 10 | 默认开启，观察 1 秒；发现候选 IP 匹配程度 0.5（+5），否则 0 |
| 浏览器标识 | 8 | 结合 User-Agent 和 UA-CH brands 按优先顺序匹配 |
| 设备标识 | 6 | 结合 User-Agent 与 UA-CH 高熵型号/平台提示；厂商匹配程度 0.5–1 |
| 区域格式 | 4 | 使用 Intl.DateTimeFormat；zh-TW 为 0，简体为 1，其他中文一般为 0.5 |
| 时区偏移 | 3 | UTC+8 匹配程度 0.7，四舍五入为 +2 |
| Emoji 渲染风格 | 3 | 由 UA 和 platform 推断；Apple 0.25、Microsoft 0.4、Google 0.35、Linux 0.5、未知 0.4 |

兼容计分模式下，检测异常或 WebRTC 超时未收到候选地址按 0 分计；界面会说明可识别的失败情况，0 分不证明不存在风险。WebRTC 受网络延迟、扩展、站点权限和浏览器策略影响，同一浏览器不同站点或不同时刻仍可能返回不同候选地址。

各项目匹配程度为 0–1，乘以权重后逐项四舍五入相加。源码位于 `assets/site/model.js`、`assets/site/rules.js` 与 `assets/site/checks.js`。

语言、字体和 UTC+8 也存在于其他地区，浏览器可能隐藏或改变标识，字体探测也可能误判，因此分数不能确定用户所在地。WebRTC 只反映地址暴露，不识别 IP 所属国家。

## 隐私与运行

- 结果只保留在浏览器内存中；刷新页面即清除。
- WebRTC 默认开启，点击检测才连接 Google 公共 STUN（stun.l.google.com:19302）。关闭该选项后不进行此网络通信，但总分是部分评分。
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

打包脚本更新资源哈希，并在 `dist/` 生成 ZIP 和 SHA-256 校验文件。资源哈希检查用于发现损坏或安装不完整，不是数字签名。可选使用 Node.js 22+ 执行 `node --test tests/*.test.js` 验证评级逻辑。

已在 macOS 验证；提供 Windows 与 Linux 启动入口，尚未完成对应系统的手动实机验证。

## 作者与许可

作者与维护者：[l2461090](https://github.com/l2461090)。

Copyright (c) 2026 l2461090。采用 [MIT 许可](LICENSE)。
