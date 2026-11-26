---
name: antigravity-login
description: 让哈基米学会反重力飞翔。代理用户在 macOS 上实际完成 Antigravity 桌面登录并测试模型回复。用于浏览器授权后桌面登录超时、提示地区不可用、需要核对账号关联地区或在地区更正后重登。
---

# 让哈基米学会反重力飞翔

## 接手并执行

用户说「帮我登录」「搞定」「试到能用」时，由你使用桌面、浏览器和终端完成操作。默认从当前状态做到收到第一条模型回复。若用户明确只要教程或只测登录，按其限定范围交付。

- 开始先看 App 是否安装、当前页面和账号。已获安装授权且缺少客户端时，从[官方下载页](https://antigravity.google/download)安装匹配架构的 macOS 桌面版，再打开它。
- 自己完成每个适用检查项。每次操作后读取页面或命令结果，决定下一步。清单外出现新错误时，依据具体提示、当次日志和官方文档继续诊断；有可验证的修复就执行并重试。向用户解释了做法之后，继续动手。
- 只有下一步确实依赖本人操作、缺少用户才能提供的事实或需要新授权时才交接。先定位到具体页面，只请用户完成那一步（例如在 Google 页面扫码），保留会话；完成后自己检查结果，接着重登和测模型。Google 正在审核时，记录回执及恢复条件，避免重复提交。
- 收尾逐项核对：标明已完成并附观察结果、因何跳过，或具体卡在哪一步。浏览器认证成功后还要检查桌面，看到首页后还要测试模型。

## 从目标账号登录

- [ ] 打开 Antigravity 桌面 App，先看当前界面。若已经进入首页，核对账号，直接做最后的验证。若停在欢迎页，点 **Continue with Google**，在浏览器选择用户指定的账号。个人 Google 账号可以使用 QQ 等第三方邮箱地址。沿用同一账号完成后续核对。[官方登录流程](https://antigravity.google/docs/install)
- [ ] 浏览器显示认证成功后切回 App，读取**本次尝试**的提示。进入首次使用界面或首页，转到最后一节。若提示地区不可用，直接核对账号地区。若回到 App 一直转圈、换取 token 超时或报 `EOF`，先排查网络。

## 换取 token 超时或 EOF

1. 查看本轮登录时间附近的 `~/Library/Logs/Antigravity/language_server.log`（如有），定位失败发生在浏览器回调、授权码交换还是账号资格检查。只摘录阶段和错误类型，避免输出含授权码、token 或完整回调 URL 的日志。`ineligible` 单独出现时，结合 App 的具体说明判断原因。
2. 在 macOS 运行 `scutil --proxy`，读取实际启用的代理地址和端口。用无凭据请求分别测试直连和现有代理。以下两条以本机曾用的端口为例，执行前核对并替换代理地址。

   ```sh
   curl --noproxy '*' --max-time 8 -sS -o /dev/null -w '%{http_code}\n' --data '' https://oauth2.googleapis.com/token
   curl --noproxy '' --proxy http://127.0.0.1:7897 --max-time 8 -sS -o /dev/null -w '%{http_code}\n' --data '' https://oauth2.googleapis.com/token
   ```

   空请求得到 Google 的 HTTP 400 表示已连到 token 端点。若浏览器也打不开授权页，用同样两条路径检查 `https://accounts.google.com/`，去掉 `--data ''`。
3. 若直连超时、代理可达且 App 仍在登录页，正常退出 App 后，可按实际地址仅为这次启动传入代理，保留本机 OAuth 回调。重登一次，看桌面端的新结果。[Electron 代理参数](https://www.electronjs.org/docs/latest/api/command-line-switches#--proxy-serveraddressport)

   ```sh
   ag_proxy='http://127.0.0.1:7897'  # 替换为上一步实测可达的地址
   HTTP_PROXY="$ag_proxy" HTTPS_PROXY="$ag_proxy" NO_PROXY="localhost,127.0.0.1,::1" \
     "/Applications/Antigravity.app/Contents/MacOS/Antigravity" --proxy-server="$ag_proxy"
   ```

本机曾试过美国网络出口、英文系统、洛杉矶时区、安装 Gemini CLI 和一次性 TLS 参数调整，之后仍出现过登录失败。常规排查可跳过这些操作。

## App 明确提示地区不可用

- [ ] 用刚才登录 App 的账号打开 Google 服务条款页，核对右上角身份及「国家/地区版本」。使用不带 `gl=US` 的链接。指定美国版本或在隐身窗口看到 United States，都不足以确认这个账号的关联地区。对照 Antigravity 当前支持名单。[查看账号地区](https://policies.google.com/terms) · [支持地区与资格说明](https://antigravity.google/docs/faq)
- [ ] 如果账号关联地区与实际情况不符，且用户要求更正，打开 Google 官方申请表，再核对页首账号和原地区。按用户提供的事实填写国家、理由及表单要求的州或子地区。例如用户确实已搬到美国，可按其实际情况选择居住或搬迁理由，州名以用户提供的信息为准。[地区更正申请](https://policies.google.com/country-association-form)
- [ ] 提交后核对回执或通知邮件。若浏览器超时或用户已自行提交，先查已有结果，避免重复提交。分别记录「用户反馈已提交」「Google 已确认收件」「关联地区已更新」中有证据的状态。
- [ ] 处理完当前能做的步骤，就在 App 用同一账号复测一次。若仍提示地区不可用且申请在审核中，等收到变更结果再重登。曾有一次复测直接进入首次使用界面，当时没有独立确认改区获批。按本轮 App 的实际表现记录结果。

## 验证结果

- [ ] **桌面登录**：浏览器完成授权后，确认目标账号在 Antigravity 进入首次使用界面或首页。若仍停在错误页，记录其具体提示和最后成功的步骤。
- [ ] **模型可用**：默认用已登录的目标账号新开空白对话，发送「只回复 OK」，读到模型实际回复后再报告可用。若发送失败，读取错误并继续处理；例如当前模型无权限时，可试账号已有额度内可选的模型，并在结果中说明实际测的是哪个模型。
