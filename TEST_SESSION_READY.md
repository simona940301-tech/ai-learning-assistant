# ✅ 测试环境已就绪！

**状态**: ✅ Ready for Testing  
**时间**: 2025-10-26  
**服务器**: http://localhost:3000  
**环境**: Batch 1.5 Hotfix 已激活

---

## 🎉 准备工作已完成

### ✅ 服务器状态
- **端口 3000**: ✅ 正在运行
- **Web 应用**: ✅ 可访问 (`http://localhost:3000`)
- **预览页面**: ✅ 可访问 (`http://localhost:3000/preview`)
- **HMR**: ✅ 已启用

### ✅ Feature Flags
所有 Batch 1.5 flags 已激活：
- ✅ `NEXT_PUBLIC_HOTFIX_BATCH1_5=true`
- ✅ `NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=true`
- ✅ `NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY=true`
- ✅ `NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API=true`
- ✅ `NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF=true`

### ✅ 测试文档
- ✅ `TEST_EXECUTION_GUIDE.md` - 详细测试步骤
- ✅ `EVIDENCE_COLLECTION_TEMPLATE.md` - 证据收集模板
- ✅ `QUICK_TEST_CHECKLIST.md` - 快速清单
- ✅ `FINAL_DUTY_REPORT.md` - 问题根因和修复说明

### ✅ 工具脚本
- ✅ `scripts/start-testing.sh` - 测试环境检查脚本
- ✅ `scripts/preview.sh` - 预览模式启动脚本

### ✅ 证据目录
- ✅ `./evidence/` - 截图和录屏保存目录

---

## 🎯 立即开始测试

### Step 1: 访问预览页面
浏览器已自动打开: **http://localhost:3000/preview**

确认所有 flags 显示 ✅ `true`

### Step 2: 打开开发者工具
按 `F12` 或 `Cmd+Opt+I`

必须打开:
- ✅ **Console** 标签
- ✅ **Network** 标签
- ✅ **Preserve log** (勾选两个标签)

### Step 3: 开始测试 3 个 Scenarios

#### 📍 Scenario A: CTA「再练一题」(5-10 分钟)
```
路径: /ask → 提交题目 → 详解页 → 点击「再练一题」
验收: P95 ≤ 2s
```

#### 📍 Scenario B: 输入框清空 (5 分钟)
```
路径: /ask → 输入消息 → 提交（按钮 / Enter）
验收: 立即清空 (0ms)
```

#### 📍 Scenario C: 完成任务 UI 更新 (10-15 分钟)
```
路径: /home → /play → 答完所有题 → 返回 /home
验收: ≤ 5s 看到 UI 更新
```

### Step 4: 收集证据
- 📹 主录屏: 30-60 秒（包含所有 3 个 scenarios）
- 📸 Console 截图: 3 张
- 📸 Network 截图: 2 张
- 📸 UI 截图: 2 张

保存到: `./evidence/`

### Step 5: 填写报告
完成 `EVIDENCE_COLLECTION_TEMPLATE.md`

---

## 📚 快速参考

### 关键文档

| 文档 | 用途 | 何时使用 |
|------|------|----------|
| **QUICK_TEST_CHECKLIST.md** | 快速清单 | ⭐ **现在开始用这个** |
| **TEST_EXECUTION_GUIDE.md** | 详细步骤 | 需要更多细节时 |
| **EVIDENCE_COLLECTION_TEMPLATE.md** | 证据模板 | 记录测试结果时 |
| **FINAL_DUTY_REPORT.md** | 根因分析 | 理解修复内容时 |

### 快速命令

**浏览器 Console**:
```javascript
// 手动刷新任务
window.__refetchMissionData()

// 清空日志
clear()
```

**终端**:
```bash
# 检查服务器
lsof -ti:3000

# 查看日志（如需要）
# Console 已经在浏览器中，这里不需要特别命令
```

---

## 🎥 录屏工具推荐

### macOS
**QuickTime** (内置):
1. 按 `Cmd+Shift+5`
2. 选择录制区域
3. 点击「录制」
4. 完成后点击停止按钮

### Windows
**Xbox Game Bar** (内置):
1. 按 `Win+G`
2. 点击录制按钮
3. 完成后点击停止

### 在线工具
**Loom** (推荐):
- 访问: https://loom.com
- 免费，易用
- 自动保存到云端

---

## 📸 截图工具

### macOS
- **区域截图**: `Cmd+Shift+4`
- **窗口截图**: `Cmd+Shift+4` 然后按 `空格键`

### Windows
- **截图工具**: `Win+Shift+S`

### Chrome DevTools
1. 右键任意元素
2. 选择 "Inspect"
3. 点击 ⋮ (三个点)
4. 选择 "Capture screenshot"

---

## ✅ 验收标准速查

### 关键指标

| 指标 | 目标 | 如何验证 |
|------|------|----------|
| **CTA P95** | ≤ 2s | Network 标签 → `/api/missions/start` → Time |
| **输入清空** | 0ms | 肉眼观察，应立即清空 |
| **任务更新** | ≤ 5s | Console 时间戳对比 |
| **Console 日志** | 完整 | 应显示 4+2+N 行日志 |
| **Network 状态** | 200/409 | 不应有 4xx/5xx (409 除外) |

---

## 🚨 测试注意事项

### ⚠️ 重要提示
1. **Preserve log 必须勾选** - 否则页面跳转后日志消失
2. **409 状态码是正常的** - 表示任务已存在（幂等性）
3. **Polling 需要等待 5 秒** - 首次轮询在 5 秒后
4. **录屏要包含 Console** - 证据需要显示日志

### ✅ 检查清单
测试每个 scenario 前:
- [ ] Console 已打开
- [ ] Network 已打开
- [ ] Preserve log 已勾选
- [ ] Console Filter 设为 "All levels"

---

## 💡 测试技巧

### Scenario A 技巧
- **记录时间**: 点击前记下时间，跳转后对比
- **多次测试**: 测试 2-3 次取平均值
- **观察 Loading**: 应该有旋转图标

### Scenario B 技巧
- **测试两种方式**: 按钮 + Enter 都要测
- **注意焦点**: 提交后光标应该仍在输入框
- **连续测试**: 清空后应该能立即输入新消息

### Scenario C 技巧
- **耐心等待**: 最多等 5 秒看 Polling
- **对比数据**: 记录更新前后的数值
- **捕捉 Confetti**: 动画很快，准备好截图/录屏

---

## 📊 预计时长

| 阶段 | 时长 |
|------|------|
| 🎯 Scenario A | 5-10 分钟 |
| 🎯 Scenario B | 5 分钟 |
| 🎯 Scenario C | 10-15 分钟 |
| 📸 证据整理 | 10 分钟 |
| 📝 填写报告 | 10 分钟 |
| **总计** | **40-50 分钟** |

---

## 🎯 成功标准

### 必须达到的指标
- ✅ **CTA P95 ≤ 2s** - Scenario A
- ✅ **输入立即清空 (0ms)** - Scenario B
- ✅ **任务更新 ≤ 5s** - Scenario C

### 必须完成的证据
- ✅ **1 个主录屏** (30-60 秒)
- ✅ **5 张关键截图** (Console × 3, Network × 2)
- ✅ **完整测试报告** (EVIDENCE_COLLECTION_TEMPLATE.md)

### 必须验证的功能
- ✅ **Console 无错误** - 所有 scenarios
- ✅ **Network 请求正常** - 200/409
- ✅ **UI 行为符合预期** - Loading, 清空, 更新

---

## 🚀 开始测试

### 推荐流程

1. **阅读** `QUICK_TEST_CHECKLIST.md` (5 分钟)
2. **打开** 预览页面和 DevTools
3. **执行** 3 个 scenarios (20-30 分钟)
4. **收集** 录屏和截图 (10 分钟)
5. **填写** `EVIDENCE_COLLECTION_TEMPLATE.md` (10 分钟)

### 一句话开始

访问: **http://localhost:3000/preview**  
打开: **F12 (DevTools)**  
开始: **QUICK_TEST_CHECKLIST.md**

---

## 📞 需要帮助？

### 文档参考
- 快速清单: `QUICK_TEST_CHECKLIST.md`
- 详细步骤: `TEST_EXECUTION_GUIDE.md`
- 问题说明: `FINAL_DUTY_REPORT.md`

### 常见问题
查看 `TEST_EXECUTION_GUIDE.md` 中的「常见问题 & 解决方案」章节

---

## ✨ 最后提醒

### 录屏要点
- ✅ Console 面板可见
- ✅ 时间戳清晰
- ✅ 关键交互清楚
- ✅ 持续 30-60 秒

### 截图要点
- ✅ 完整的 Console 日志
- ✅ Network Timing 详情
- ✅ 更新前后对比

### 报告要点
- ✅ 所有指标数据
- ✅ Pass/Fail 状态
- ✅ 问题描述（如有）

---

## 🎉 准备完成！

**所有环境已就绪，所有文档已准备，现在开始测试！**

### 第一步

打开: **http://localhost:3000/preview**

验证所有 flags 显示 ✅

---

**祝测试顺利！** 🚀✨

---

**P.S.** 记得保存所有证据到 `./evidence/` 目录！

