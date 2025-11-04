# 🧪 Batch 1.5 测试执行指南

**测试时间**: 2025-10-26
**服务器状态**: ✅ 运行中 (`http://localhost:3000`)
**环境**: Batch 1.5 Hotfix 已激活

---

## 📋 测试前检查清单

### 1. 确认服务器运行

```bash
# 检查端口 3000
lsof -ti:3000

# 应该返回进程 ID (例如: 97238)
```

✅ **状态**: 服务器已在运行

### 2. 验证 Feature Flags

访问: `http://localhost:3000/preview`

确认所有 flags 显示 ✅ `true`:
- ✅ BATCH 1.5
- ✅ Single CTA
- ✅ Near Difficulty
- ✅ Batch API
- ✅ Sampler Performance

### 3. 开启开发者工具

**Chrome/Edge**: `F12` 或 `Cmd+Opt+I`

**必须打开的标签**:
1. ✅ **Console** - 查看日志输出
2. ✅ **Network** - 查看 API 请求
3. ✅ **Preserve log** - 勾选（防止页面跳转时清除日志）

---

## 🎯 Scenario A: CTA「再练一题」

### 目标
验证点击「再练一题」按钮后，P95 ≤ 2s 完成跳转，不会卡住。

### 路径
`/play` 或 `/ask` → 答题 → 详解页 → 点击「再练一题」

### 详细步骤

#### Step 1: 进入答题页面
```
访问: http://localhost:3000/ask
或: http://localhost:3000/play
```

#### Step 2: 提交一道题目
在输入框输入任意题目，例如：
```
三角形 ABC，已知 a=5, b=7, C=60°，求 c=?
```

#### Step 3: 查看详解页
- 等待 AI 生成详解
- 应该看到详解卡片
- 底部有「再练一题」按钮（Single CTA）

#### Step 4: 打开 DevTools
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 勾选 **Preserve log**
4. 切换到 **Network** 标签
5. 勾选 **Preserve log**

#### Step 5: 点击「再练一题」
1. **记录开始时间**: 记下当前时间（例如: 10:23:45）
2. 点击「再练一题」按钮
3. 观察 Console 输出
4. 观察 Network 请求
5. **记录结束时间**: 页面跳转完成时的时间

### ✅ 验收标准

#### Console 输出（必须包含）
```
[时间戳] [ExplanationCard] CTA clicked at 2025-10-26T10:23:45.123Z
[时间戳] [ExplanationCard] Fetching mission with payload: {...}
[时间戳] [ExplanationCard] API responded in XXXms
[时间戳] [ExplanationCard] Total time: XXXms - Navigating to /play
```

#### Network 请求（必须显示）
```
Request: POST /api/missions/start
Status: 200 OK 或 409 (Conflict - 正常，表示任务已存在)
Time: < 2000ms ✅
```

#### UI 行为（必须出现）
- ✅ 点击后立即显示 Loading 状态（旋转图标）
- ✅ 2 秒内跳转到新题目页面
- ✅ Loading 状态结束
- ✅ 页面没有卡住或白屏

### 📸 证据收集

**需要截取**:
1. ✅ Console 完整日志（包含所有 4 行）
2. ✅ Network 标签中的 `/api/missions/start` 请求详情
3. ✅ Timing breakdown（点击 Network 请求 → Timing 标签）

**录屏重点**:
- 从点击按钮开始录制
- 显示 Console 面板
- 显示页面跳转过程
- 持续 5-10 秒

---

## 🎯 Scenario B: 输入框清空

### 目标
验证提交消息后，输入框立即清空（0ms 延迟），焦点不乱跳。

### 路径
`/ask` (对话页)

### 详细步骤

#### Step 1: 进入 Ask 页面
```
访问: http://localhost:3000/ask
```

#### Step 2: 打开 DevTools
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 清空 Console（点击 🚫 图标）

#### Step 3: 输入测试消息
在底部输入框输入：
```
Test message for clearing verification
```

#### Step 4a: 测试 - 按送出按钮
1. **不要按 Enter**，点击送出按钮（或飞机图标）
2. **立即观察输入框** - 应该立即清空
3. 观察 Console 输出
4. 确认焦点仍在输入框（光标可见）

#### Step 4b: 测试 - 按 Enter 键
1. 再次输入测试消息
2. **按 Enter 键**（不按 Shift）
3. **立即观察输入框** - 应该立即清空
4. 观察 Console 输出
5. 确认焦点仍在输入框

### ✅ 验收标准

#### Console 输出（按钮提交）
```
[时间戳] [InputDock] Submitting at 2025-10-26T10:24:10.456Z: Test message for clearing verification
[时间戳] [InputDock] Submit complete, input cleared
```

#### Console 输出（Enter 提交）
```
[时间戳] [InputDock] Enter pressed at 2025-10-26T10:24:10.456Z
[时间戳] [InputDock] Enter submit complete, input cleared
```

#### UI 行为（必须出现）
- ✅ 点击送出按钮：输入框立即清空（不等 API 响应）
- ✅ 按 Enter：输入框立即清空
- ✅ 焦点保持在输入框（光标可见，可以继续输入）
- ✅ 消息出现在对话历史中

### 📸 证据收集

**需要截取**:
1. ✅ Console 日志（显示 Submitting 和 Submit complete）
2. ✅ 清空前后的输入框状态（可以用连续截图）

**录屏重点**:
- 显示输入框
- 显示 Console 面板
- 展示两种提交方式（按钮 + Enter）
- 强调输入框立即清空的瞬间
- 持续 10-15 秒

---

## 🎯 Scenario C: 完成任务 UI 更新

### 目标
验证完成任务后，5 秒内 UI 自动更新（剩余题数、Streak、Confetti）。

### 路径
`/home` (有 MicroMissionCard) → `/play` → 答完所有题 → 返回 `/home`

### 详细步骤

#### Step 1: 进入 Home 页面
```
访问: http://localhost:3000/home
```

#### Step 2: 检查任务卡片
- 找到「每日微任务」卡片
- 查看当前状态：
  - 剩余题数（例如: 5 题）
  - 当前 Streak（例如: 7 天）
  - 进度条（例如: 80%）

#### Step 3: 打开 DevTools
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 勾选 **Preserve log**

#### Step 4: 开始任务
1. 点击「开始」或「继续」按钮
2. 观察 Console（应该显示点击日志）
3. 自动跳转到 `/play`

#### Step 5: 完成所有题目
- 答完所有题（例如 5 题）
- 完成后返回到其他页面或 `/home`

#### Step 6: 观察 Polling
返回 `/home` 后，观察 Console：
```
[时间戳] [MicroMissionCard] Mission in progress, setting up polling
[时间戳] [MicroMissionCard] Polling for mission updates
[时间戳] [MicroMissionCard] Polling for mission updates
... (每 5 秒一次)
```

#### Step 7: 等待 UI 更新
**等待最多 5 秒**，应该看到：
- ✅ 剩余题数: 5 → 0
- ✅ Streak: 7 → 8（如果今日首次完成）
- ✅ 进度条: 80% → 100%
- ✅ Confetti 动画（持续 2 秒）
- ✅ Streak +1 badge（持续 2 秒）
- ✅ 按钮: 「继续」→「明天再来」(disabled)

### ✅ 验收标准

#### Console 输出（必须包含）
```
[时间戳] [MicroMissionCard] Mission in progress, setting up polling
[时间戳] [MicroMissionCard] Polling for mission updates
[时间戳] [MicroMissionCard] Polling for mission updates
... (每隔 5 秒)
```

#### UI 变化（必须出现）
- ✅ 5 秒内完成所有 UI 更新
- ✅ 剩余题数正确递减
- ✅ Streak 正确增加
- ✅ Confetti 动画播放
- ✅ 按钮状态正确更新

### 📸 证据收集

**需要截取**:
1. ✅ Console Polling 日志（显示每 5 秒的轮询）
2. ✅ 更新前的任务卡片状态
3. ✅ 更新后的任务卡片状态（含 Confetti）

**录屏重点**:
- 显示 Console Polling 日志
- 显示任务卡片
- 捕捉 UI 变化的瞬间（剩余题数、Streak、Confetti）
- 持续 15-20 秒（包含完整的 polling 周期）

### 🔧 手动触发（可选）

如果不想等 5 秒，可以在 Console 手动触发：
```javascript
window.__refetchMissionData()
```

应该立即看到 UI 更新。

---

## 📊 测试结果记录表

### Scenario A: CTA「再练一题」

| 检查项 | 目标 | 实际值 | 状态 |
|--------|------|--------|------|
| Console 日志完整 | 4 行日志 | _____ | ⬜ |
| API 响应时间 | < 2000ms | _____ ms | ⬜ |
| 总耗时 | < 2000ms | _____ ms | ⬜ |
| Loading 状态正确 | ✅ | _____ | ⬜ |
| 页面跳转成功 | ✅ | _____ | ⬜ |

### Scenario B: 输入框清空

| 检查项 | 目标 | 实际值 | 状态 |
|--------|------|--------|------|
| 按钮提交清空 | 0ms | _____ | ⬜ |
| Enter 提交清空 | 0ms | _____ | ⬜ |
| 焦点保持 | ✅ | _____ | ⬜ |
| Console 日志完整 | 2 行 | _____ | ⬜ |

### Scenario C: 完成任务 UI 更新

| 检查项 | 目标 | 实际值 | 状态 |
|--------|------|--------|------|
| Polling 间隔 | 5s | _____ s | ⬜ |
| UI 更新延迟 | ≤ 5s | _____ s | ⬜ |
| 剩余题数更新 | ✅ | _____ | ⬜ |
| Streak 更新 | ✅ | _____ | ⬜ |
| Confetti 播放 | ✅ | _____ | ⬜ |

---

## 📸 证据清单

### 必须提供的截图/录屏

#### 1. 螢幕錄影 (1 個，30-60 秒)
- ⬜ 包含所有 3 个 scenarios
- ⬜ Console 面板可见
- ⬜ 展示关键时刻（点击、清空、更新）
- ⬜ 格式: MP4 或 GIF
- ⬜ 分辨率: ≥ 1280x720

#### 2. Console 截图 (3 張)
- ⬜ **Screenshot A**: ExplanationCard 事件流（4 行日志）
- ⬜ **Screenshot B**: InputDock 送出日志（2 行日志）
- ⬜ **Screenshot C**: MicroMissionCard Polling 日志（多行）

#### 3. Network 截图 (2 張)
- ⬜ **Screenshot D**: `/api/missions/start` Timing（< 2s）
- ⬜ **Screenshot E**: `/api/analytics/batch` Timing（< 150ms）

---

## 🚨 常见问题 & 解决方案

### Q1: Console 没有显示日志
**A**: 
1. 确认 Console 已打开（F12）
2. 确认没有开启 Filter（应该显示 All levels）
3. 刷新页面重试

### Q2: Network 请求返回 409
**A**: 
- ✅ 409 是正常的（表示任务已存在，idempotent response）
- 只要时间 < 2s，就算通过

### Q3: 输入框没有立即清空
**A**: 
1. 检查是否使用了正确的提交方式（按钮或 Enter）
2. 查看 Console 是否有错误
3. 刷新页面重试

### Q4: Polling 日志没有出现
**A**: 
1. 确认任务状态为 `in_progress`
2. 等待至少 5 秒（首次轮询）
3. 检查 Console 是否有错误

### Q5: Confetti 没有播放
**A**: 
1. 确认任务确实完成（剩余题数 = 0）
2. 等待 5 秒让 polling 更新状态
3. 或手动触发: `window.__refetchMissionData()`

---

## 📞 问题上报模板

如果发现问题，请提供：

```markdown
### 问题描述
[详细描述问题]

### Scenario
[ ] A: CTA「再练一题」
[ ] B: 输入框清空
[ ] C: 完成任务 UI 更新

### 复现步骤
1. 
2. 
3. 

### 实际行为
[描述实际发生的情况]

### 预期行为
[描述应该发生的情况]

### Console 日志
```
[粘贴完整 Console 输出]
```

### Network 截图
[附上 Network 标签截图]

### 其他信息
- 浏览器: 
- 时间: 
- Feature Flags: 
```

---

## ✅ 完成检查

测试完成后，确认：

- ⬜ 3 个 scenarios 全部测试完成
- ⬜ 所有验收标准都通过
- ⬜ 录屏已保存（30-60 秒）
- ⬜ Console 截图已保存（3 张）
- ⬜ Network 截图已保存（2 张）
- ⬜ 测试结果记录表已填写
- ⬜ 无重大问题发现

---

**测试完成后，将证据提交至验收报告！** 🎉

---

## 快速命令参考

```bash
# 检查服务器状态
lsof -ti:3000

# 重启服务器（如果需要）
pkill -f "next dev"
pnpm run dev

# 查看 Feature Flags
cat .env.preview | grep HOTFIX

# 访问预览页面
open http://localhost:3000/preview
```

---

**祝测试顺利！** 🚀

