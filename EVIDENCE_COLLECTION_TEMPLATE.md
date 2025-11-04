# 📸 Batch 1.5 测试证据收集

**测试日期**: 2025-10-26
**测试人员**: _____________
**环境**: Batch 1.5 Hotfix (本地开发环境)
**服务器**: http://localhost:3000

---

## 🎯 测试概览

| Scenario | 状态 | P95/延迟 | 问题数 |
|----------|------|----------|--------|
| A: CTA「再练一题」 | ⬜ Pass / ⬜ Fail | _____ ms | _____ |
| B: 输入框清空 | ⬜ Pass / ⬜ Fail | _____ ms | _____ |
| C: 完成任务 UI 更新 | ⬜ Pass / ⬜ Fail | _____ s | _____ |

**总体评分**: ⬜ ✅ 全部通过 / ⬜ ⚠️ 部分通过 / ⬜ ❌ 未通过

---

## 📊 Scenario A: CTA「再练一题」

### 测试数据

| 指标 | 目标 | 实际值 | 状态 |
|------|------|--------|------|
| **API 响应时间** | < 2000ms | _______ ms | ⬜ ✅ / ⬜ ❌ |
| **总耗时 (P95)** | ≤ 2000ms | _______ ms | ⬜ ✅ / ⬜ ❌ |
| **Console 日志完整性** | 4 行 | _______ 行 | ⬜ ✅ / ⬜ ❌ |
| **Loading 状态** | 显示 | ⬜ 是 / ⬜ 否 | ⬜ ✅ / ⬜ ❌ |
| **页面跳转** | 成功 | ⬜ 是 / ⬜ 否 | ⬜ ✅ / ⬜ ❌ |
| **Network 状态码** | 200/409 | _______ | ⬜ ✅ / ⬜ ❌ |

### Console 日志输出

```
[粘贴完整 Console 输出]

示例:
[10:23:45.123] [ExplanationCard] CTA clicked at 2025-10-26T10:23:45.123Z
[10:23:45.124] [ExplanationCard] Fetching mission with payload: {...}
[10:23:45.856] [ExplanationCard] API responded in 732ms
[10:23:45.856] [ExplanationCard] Total time: 733ms - Navigating to /play
```

### Network 请求详情

**请求**: POST /api/missions/start

| 字段 | 值 |
|------|-----|
| Status | _______ |
| Time | _______ ms |
| Queueing | _______ ms |
| TTFB | _______ ms |
| Content Download | _______ ms |

### 观察结果

**UI 行为**:
- ⬜ Loading 图标立即显示
- ⬜ 2 秒内跳转到新页面
- ⬜ 无卡顿或白屏
- ⬜ 新题目正确加载

**问题/备注**:
```
[如有问题，详细描述]
```

### 📸 证据文件

- ⬜ Screenshot A: Console 日志 (`evidence-a-console.png`)
- ⬜ Screenshot D: Network Timing (`evidence-a-network.png`)
- ⬜ 录屏片段: 点击到跳转 (5-10 秒)

---

## 📊 Scenario B: 输入框清空

### 测试数据

| 测试方式 | 清空延迟 | 焦点保持 | Console 日志 | 状态 |
|----------|----------|----------|--------------|------|
| **按送出按钮** | _______ ms | ⬜ 是 / ⬜ 否 | ⬜ ✅ / ⬜ ❌ | ⬜ ✅ / ⬜ ❌ |
| **按 Enter 键** | _______ ms | ⬜ 是 / ⬜ 否 | ⬜ ✅ / ⬜ ❌ | ⬜ ✅ / ⬜ ❌ |

**目标**: 0ms 延迟（立即清空）

### Console 日志输出

#### 送出按钮测试
```
[粘贴 Console 输出]

示例:
[10:24:10.456] [InputDock] Submitting at 2025-10-26T10:24:10.456Z: Test message
[10:24:10.789] [InputDock] Submit complete, input cleared
```

#### Enter 键测试
```
[粘贴 Console 输出]

示例:
[10:24:15.123] [InputDock] Enter pressed at 2025-10-26T10:24:15.123Z
[10:24:15.456] [InputDock] Enter submit complete, input cleared
```

### 观察结果

**UI 行为**:
- ⬜ 输入框立即清空（无延迟感）
- ⬜ 焦点保持在输入框
- ⬜ 光标可见
- ⬜ 可以立即输入新消息
- ⬜ 消息出现在对话历史

**行为一致性**:
- ⬜ 按钮提交和 Enter 提交行为一致

**问题/备注**:
```
[如有问题，详细描述]
```

### 📸 证据文件

- ⬜ Screenshot B: Console 日志 (`evidence-b-console.png`)
- ⬜ 录屏片段: 输入到清空 (10-15 秒，展示两种提交方式)

---

## 📊 Scenario C: 完成任务 UI 更新

### 测试数据

| 指标 | 目标 | 实际值 | 状态 |
|------|------|--------|------|
| **Polling 间隔** | 5 秒 | _______ s | ⬜ ✅ / ⬜ ❌ |
| **UI 更新延迟** | ≤ 5 秒 | _______ s | ⬜ ✅ / ⬜ ❌ |
| **剩余题数更新** | 正确 | ⬜ 是 / ⬜ 否 | ⬜ ✅ / ⬜ ❌ |
| **Streak 更新** | +1 | ⬜ 是 / ⬜ 否 | ⬜ ✅ / ⬜ ❌ |
| **Confetti 播放** | 2 秒 | ⬜ 是 / ⬜ 否 | ⬜ ✅ / ⬜ ❌ |

### 任务数据

**完成前**:
- 剩余题数: _______
- Streak: _______
- 进度条: _______ %

**完成后** (5 秒内):
- 剩余题数: _______
- Streak: _______
- 进度条: _______ %

**变化正确性**: ⬜ ✅ 正确 / ⬜ ❌ 不正确

### Console 日志输出

```
[粘贴 Polling 日志]

示例:
[10:25:00.000] [MicroMissionCard] Mission in progress, setting up polling
[10:25:05.000] [MicroMissionCard] Polling for mission updates
[10:25:10.000] [MicroMissionCard] Polling for mission updates
[10:25:15.000] [MicroMissionCard] Polling for mission updates
```

**Polling 次数**: _______
**间隔均值**: _______ s

### 观察结果

**UI 更新行为**:
- ⬜ 5 秒内看到 UI 变化
- ⬜ 剩余题数正确更新
- ⬜ Streak 正确增加
- ⬜ Confetti 动画播放
- ⬜ Streak +1 badge 显示
- ⬜ 按钮状态变更为「明天再来」

**Polling 行为**:
- ⬜ Polling 正确启动（任务进行中时）
- ⬜ Polling 每 5 秒执行一次
- ⬜ Polling 在任务完成后正确停止

**手动触发测试** (可选):
- ⬜ 执行 `window.__refetchMissionData()`
- ⬜ UI 立即更新
- 更新延迟: _______ ms

**问题/备注**:
```
[如有问题，详细描述]
```

### 📸 证据文件

- ⬜ Screenshot C: Console Polling 日志 (`evidence-c-console.png`)
- ⬜ Screenshot: 更新前的任务卡片 (`evidence-c-before.png`)
- ⬜ Screenshot: 更新后的任务卡片 (`evidence-c-after.png`)
- ⬜ 录屏片段: 完成任务到 UI 更新 (15-20 秒)

---

## 🎥 录屏文件

### 主要录屏 (30-60 秒)

**文件名**: `batch1.5-test-recording.mp4`

**包含内容检查**:
- ⬜ Scenario A: 点击「再练一题」(5-10 秒)
- ⬜ Scenario B: 输入框清空 (10-15 秒)
- ⬜ Scenario C: 任务 UI 更新 (15-20 秒)
- ⬜ Console 面板可见
- ⬜ Network 面板可见（至少在 Scenario A 时）
- ⬜ 时间戳清晰可读
- ⬜ 关键交互清晰展示

**技术规格**:
- 格式: ⬜ MP4 / ⬜ GIF / ⬜ 其他: _______
- 分辨率: _______ x _______
- 时长: _______ 秒
- 文件大小: _______ MB

---

## 📊 性能指标汇总

### 核心指标

| 指标 | 目标 | 实际值 | 状态 | 备注 |
|------|------|--------|------|------|
| **CTA P95** | ≤ 2s | _______ ms | ⬜ ✅ / ⬜ ❌ | |
| **Input 清空延迟** | 0ms | _______ ms | ⬜ ✅ / ⬜ ❌ | |
| **任务更新延迟** | ≤ 5s | _______ s | ⬜ ✅ / ⬜ ❌ | |
| **Analytics 上报** | < 150ms | _______ ms | ⬜ ✅ / ⬜ ❌ | 非阻塞 |
| **Sampler P95** | < 80ms | _______ ms | ⬜ ✅ / ⬜ ❌ | |

### 功能需求 (DoD)

| 需求 | 状态 | 备注 |
|------|------|------|
| Console 无未捕捉错误 | ⬜ ✅ / ⬜ ❌ | |
| Network 无 4xx/5xx (409 除外) | ⬜ ✅ / ⬜ ❌ | |
| `/api/analytics/batch` 返回 200 | ⬜ ✅ / ⬜ ❌ | |
| 输入框立即清空 | ⬜ ✅ / ⬜ ❌ | |
| 焦点不乱跳 | ⬜ ✅ / ⬜ ❌ | |
| 任务状态同步更新 | ⬜ ✅ / ⬜ ❌ | |

---

## ❌ 问题记录

### 发现的问题

#### 问题 #1
**Scenario**: ⬜ A / ⬜ B / ⬜ C

**严重程度**: ⬜ Critical / ⬜ Major / ⬜ Minor

**描述**:
```
[详细描述问题]
```

**复现步骤**:
1. 
2. 
3. 

**预期行为**:
```
[描述应该发生的情况]
```

**实际行为**:
```
[描述实际发生的情况]
```

**Console 输出**:
```
[粘贴相关日志]
```

**截图**: `issue-1-screenshot.png`

---

#### 问题 #2
*(如有更多问题，复制上面的模板)*

---

## 💡 改进建议

### UI/UX 改进
```
[如有 UI/UX 改进建议]
```

### 性能优化建议
```
[如有性能优化建议]
```

### 其他建议
```
[其他任何建议]
```

---

## ✅ 测试总结

### 整体评估

**通过的 Scenarios**: _______ / 3

**整体状态**: ⬜ ✅ 全部通过 / ⬜ ⚠️ 部分通过 / ⬜ ❌ 未通过

### 性能评估

**P95 达标情况**:
- CTA: ⬜ ✅ ≤ 2s / ⬜ ❌ > 2s
- 输入清空: ⬜ ✅ 0ms / ⬜ ❌ 有延迟
- 任务更新: ⬜ ✅ ≤ 5s / ⬜ ❌ > 5s

### 功能评估

**核心功能正常**:
- ⬜ 再练一题功能正常
- ⬜ 输入框清空正常
- ⬜ 任务状态同步正常
- ⬜ Analytics 非阻塞工作正常
- ⬜ Polling 机制正常

### 可观测性评估

**日志完整性**:
- ⬜ ExplanationCard 日志完整
- ⬜ InputDock 日志完整
- ⬜ MicroMissionCard 日志完整
- ⬜ 时间戳正确
- ⬜ 无错误日志

### 最终建议

⬜ **推荐上线** - 所有测试通过，无重大问题

⬜ **有条件上线** - 部分测试通过，有小问题但不影响核心功能

⬜ **不推荐上线** - 发现重大问题，需要修复后重新测试

**理由**:
```
[简述推荐理由]
```

---

## 📎 附件清单

### 截图文件
- ⬜ `evidence-a-console.png` - Scenario A Console 日志
- ⬜ `evidence-a-network.png` - Scenario A Network Timing
- ⬜ `evidence-b-console.png` - Scenario B Console 日志
- ⬜ `evidence-c-console.png` - Scenario C Polling 日志
- ⬜ `evidence-c-before.png` - 任务卡片更新前
- ⬜ `evidence-c-after.png` - 任务卡片更新后
- ⬜ `evidence-e-analytics.png` - Analytics Batch API Timing

### 录屏文件
- ⬜ `batch1.5-test-recording.mp4` - 主要录屏 (30-60 秒)

### 日志文件 (可选)
- ⬜ `console-full-log.txt` - 完整 Console 输出
- ⬜ `network-har.har` - Network HAR 文件（Chrome DevTools 导出）

---

## 📝 签名确认

**测试人员**: _________________________

**测试日期**: _________________________

**测试时长**: _______ 分钟

**签名**: _________________________

---

**测试完成！** 🎉

---

## 快速参考

### Console 命令
```javascript
// 手动触发任务刷新
window.__refetchMissionData()

// 检查 Feature Flags
console.log(FLAGS)

// 清空 Console
clear()
```

### 截图快捷键
- **macOS**: `Cmd + Shift + 4` (区域截图)
- **Windows**: `Win + Shift + S` (Snipping Tool)
- **Chrome DevTools**: 右键 → "Save as..."

### 录屏工具
- **macOS**: QuickTime (Cmd + Shift + 5)
- **在线**: Loom (https://loom.com)
- **Windows**: Xbox Game Bar (Win + G)

---

**需要帮助？** 查看 `TEST_EXECUTION_GUIDE.md` 获取详细测试步骤。

