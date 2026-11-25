---
name: antigravity-login
description: 让哈基米学会反重力飞翔。在 macOS 上用指定的个人 Google 账号登录 Antigravity 桌面 App。用于浏览器授权后桌面登录超时、提示地区不可用、需要核对账号关联地区或在地区更正后重登。
---

# 让哈基米学会反重力飞翔

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
- [ ] 用户要求复测或收到地区变更结果时，在 App 重新选择同一账号登录。曾有一次复测直接进入首次使用界面，当时没有独立确认改区获批。按本轮 App 的实际表现记录结果。

## 验证结果

- [ ] **桌面登录**：浏览器完成授权后，确认目标账号在 Antigravity 进入首次使用界面或首页。若仍停在错误页，记录其具体提示和最后成功的步骤。
- [ ] **模型可用**：用户目标包括「能用上」时，在已登录的 App 新开对话，发「只回复 OK」，看到模型回复再记为已验证。仅要求登录时，报告桌面登录结果即可。
