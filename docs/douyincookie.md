已修复登录流程，点击“登录平台”后会先执行登录以刷新 Cookie，成功后再重新获取用户信息，避免一直显示旧用户。

变更要点

新增 Redux 异步动作：
loginWithDouyinWeb：打开抖音网页登录窗口，成功后写入 Cookie 文件，再 dispatch 获取用户信息。
loginWithDouyinCompanion：从直播伴侣读取并解密 Cookie，写入 Cookie 文件，再 dispatch 获取用户信息。
更新 HomePage 登录按钮逻辑：
点击“登录平台”时弹出选择窗口（LoginModal）。
选择“抖音网页登录” -> dispatch(loginWithDouyinWeb())
选择“抖音直播伴侣” -> dispatch(loginWithDouyinCompanion())
登录成功后自动再次获取用户信息并刷新 UI。
涉及文件

src/renderer/store/features/user/userSlice.ts
新增 thunks: loginWithDouyinWeb, loginWithDouyinCompanion
在 extraReducers 中接入两种登录流程的 pending/fulfilled/rejected，并在 fulfilled 时更新 douyinUserInfo 与 isLoggedIn
src/renderer/pages/HomePage.tsx
导入新 thunks
将 LoginModal 的 onWebLogin/onCompanionLogin 分别绑定到 handleWebLogin/handleCompanionLogin（会 dispatch 新 thunks 并在完成后关闭弹窗）
现有主进程逻辑说明

登录窗口模块 src/main/modules/douyinWebLogin.ts：
打开抖音“我的主页”，定时检测 sessionid 等 Cookie，登录成功后保存 Cookie 到文件，并尝试提取昵称、头像
支持清理之前的浏览器数据，避免旧会话干扰
直播伴侣 Cookie 提取 src/main/modules/getDouyinCompanionCookies.ts：
从 webcast_mate 的 Cookies 数据库解密 douyin.com Cookie，写入 Cookie 文件
获取用户信息 src/main/modules/douyinUserInfo.ts：
读取 Cookie 文件调用 amemv webcast API 返回昵称/头像/粉丝等信息
如何验证

启动应用，进入主页，点击“登录平台”
选择“抖音网页登录”或“抖音直播伴侣”
登录成功后，用户信息区域应刷新为新账号的昵称、头像、粉丝数
再次点击“登录平台”选择另一方式登录，用户信息应再次刷新为对应账号