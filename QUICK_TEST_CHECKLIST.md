# ✅ Batch 1.5 快速测试清单

**测试日期**: 2025-10-26  
**服务器**: ✅ http://localhost:3000  
**环境**: Batch 1.5 Hotfix 已激活

---

## 📋 测试前准备 (5 分钟)

### 1. 确认服务器运行
```bash
# 检查端口
lsof -ti:3000
```
✅ **状态**: 服务器已运行

### 2. 验证 Feature Flags
访问: http://localhost:3000/preview

确认所有显示 ✅:
- [x] BATCH 1.5: true
- [x] Single CTA: true
- [x] Near Difficulty: true
- [x] Batch API: true
- [x] Sampler Performance: true

### 3. 打开 DevTools
按 `F12` 或 `Cmd+Opt+I`

必须打开:
- [x] **Console** 标签
- [x] **Network** 标签
- [x] **Preserve log** (两个标签都要勾选)

---

## 🎯 Scenario A: CTA「再练一题」(5-10 分钟)

### 快速步骤
1. 访问 `/ask` 或 `/play`
2. 提交题目: `三角形 ABC，已知 a=5, b=7, C=60°，求 c=?`
3. 进入详解页
4. **打开 Console + Network**
5. 点击「再练一题」
6. 观察日志和时间

### ✅ 检查项
- [ ] Console 显示 4 行日志
- [ ] API 响应时间 < 2000ms
- [ ] 总耗时 < 2000ms
- [ ] Loading 状态显示
- [ ] 成功跳转到新题

### 📸 需要截取
- [ ] Console 日志截图
- [ ] Network 请求 Timing 截图
- [ ] 录屏 5-10 秒

---

## 🎯 Scenario B: 输入框清空 (5 分钟)

### 快速步骤
1. 访问 `/ask`
2. **打开 Console**
3. 输入测试消息
4a. 点击送出按钮 → 观察
4b. 按 Enter → 观察

### ✅ 检查项
- [ ] 按钮提交：立即清空
- [ ] Enter 提交：立即清空
- [ ] 焦点保持在输入框
- [ ] Console 显示时间戳

### 📸 需要截取
- [ ] Console 日志截图
- [ ] 录屏 10-15 秒（展示两种方式）

---

## 🎯 Scenario C: 完成任务 UI 更新 (10-15 分钟)

### 快速步骤
1. 访问 `/home`，记录任务状态（剩余题数、Streak）
2. **打开 Console + Preserve log**
3. 点击「开始」→ 进入 `/play`
4. 答完所有题
5. 返回 `/home`
6. **等待最多 5 秒**，观察 UI 变化

### ✅ 检查项
- [ ] Console 显示 Polling 日志（每 5 秒）
- [ ] 5 秒内 UI 更新
- [ ] 剩余题数正确更新
- [ ] Streak 增加
- [ ] Confetti 动画播放

### 📸 需要截取
- [ ] Console Polling 日志截图
- [ ] 更新前的任务卡片截图
- [ ] 更新后的任务卡片截图
- [ ] 录屏 15-20 秒

---

## 📊 验收标准速查

| 指标 | 目标 | 测试方法 |
|------|------|----------|
| **CTA P95** | ≤ 2s | Network 标签查看总时长 |
| **输入清空** | 0ms | 肉眼观察是否立即清空 |
| **任务更新** | ≤ 5s | 计时器或 Console 时间戳 |

---

## 🎥 录屏要求

### 主录屏 (30-60 秒)
包含所有 3 个 scenarios：
- Scenario A: 5-10 秒
- Scenario B: 10-15 秒
- Scenario C: 15-20 秒

### 必须显示
- ✅ Console 面板
- ✅ 时间戳清晰可读
- ✅ 关键交互清晰

### 工具推荐
- **macOS**: QuickTime (`Cmd+Shift+5`)
- **在线**: Loom (https://loom.com)
- **Windows**: Xbox Game Bar (`Win+G`)

---

## 📸 截图清单

### Console 截图 (3 张)
- [ ] **A-Console**: ExplanationCard 4 行日志
- [ ] **B-Console**: InputDock 提交日志
- [ ] **C-Console**: MicroMissionCard Polling 日志

### Network 截图 (2 张)
- [ ] **A-Network**: `/api/missions/start` Timing
- [ ] **E-Analytics**: `/api/analytics/batch` Timing

### UI 截图 (2 张)
- [ ] **C-Before**: 任务卡片更新前
- [ ] **C-After**: 任务卡片更新后（含 Confetti）

**保存位置**: `./evidence/`

---

## 🚨 常见问题速查

### Q: Console 没有日志
**A**: 刷新页面 → 重新操作 → 检查 Filter 设置

### Q: Network 显示 409
**A**: ✅ 正常！409 表示任务已存在（幂等性）

### Q: 输入框没有立即清空
**A**: 检查是否使用正确版本 → 刷新页面重试

### Q: Polling 日志没有出现
**A**: 确认任务状态为 `in_progress` → 等待 5 秒

### Q: Confetti 没有播放
**A**: 手动触发: `window.__refetchMissionData()`

---

## 💡 快速命令

### 浏览器 Console
```javascript
// 手动刷新任务数据
window.__refetchMissionData()

// 检查 Feature Flags
console.log(FLAGS)

// 清空 Console
clear()
```

### 终端
```bash
# 检查服务器
lsof -ti:3000

# 查看环境变量
cat .env.preview | grep HOTFIX

# 重启服务器（如需要）
pkill -f "next dev" && pnpm run dev
```

---

## ✅ 完成检查

测试完成后，确认：

### 测试执行
- [ ] 3 个 scenarios 全部完成
- [ ] 所有验收标准通过
- [ ] 无重大错误或问题

### 证据收集
- [ ] 主录屏 (30-60 秒)
- [ ] Console 截图 × 3
- [ ] Network 截图 × 2
- [ ] UI 截图 × 2
- [ ] 所有文件保存在 `./evidence/`

### 文档记录
- [ ] `EVIDENCE_COLLECTION_TEMPLATE.md` 已填写
- [ ] 性能数据已记录
- [ ] 问题（如有）已记录

---

## 📝 下一步

测试完成后：

1. **整理证据**
   - 将所有截图放入 `./evidence/` 目录
   - 重命名文件（使用清晰的命名）

2. **填写报告**
   - 完成 `EVIDENCE_COLLECTION_TEMPLATE.md`
   - 记录所有性能指标
   - 记录任何发现的问题

3. **提交结果**
   - 录屏上传（MP4 或 GIF）
   - 截图打包
   - 报告文档

---

## 📚 参考文档

- **详细测试步骤**: `TEST_EXECUTION_GUIDE.md`
- **证据收集模板**: `EVIDENCE_COLLECTION_TEMPLATE.md`
- **问题根因分析**: `FINAL_DUTY_REPORT.md`
- **预览工作流**: `PREVIEW_WORKFLOW.md`

---

## ⏱️ 预计时长

| 阶段 | 时长 |
|------|------|
| 环境准备 | 5 分钟 |
| Scenario A | 5-10 分钟 |
| Scenario B | 5 分钟 |
| Scenario C | 10-15 分钟 |
| 证据整理 | 10 分钟 |
| **总计** | **35-45 分钟** |

---

## 🎯 关键成功指标

### 必须达到
- ✅ CTA P95 ≤ 2s
- ✅ 输入立即清空 (0ms)
- ✅ 任务更新 ≤ 5s

### 必须验证
- ✅ Console 无错误
- ✅ Network 请求正常 (200/409)
- ✅ UI 行为符合预期

### 必须记录
- ✅ 完整录屏
- ✅ 关键截图
- ✅ 性能数据

---

**准备好了吗？** 🚀

开始测试: 访问 http://localhost:3000/preview

**祝测试顺利！** ✨

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 `TEST_EXECUTION_GUIDE.md` 获取详细步骤
2. 检查 `FINAL_DUTY_REPORT.md` 了解预期行为
3. 记录问题并在 `EVIDENCE_COLLECTION_TEMPLATE.md` 中描述

---

**End of Checklist**

