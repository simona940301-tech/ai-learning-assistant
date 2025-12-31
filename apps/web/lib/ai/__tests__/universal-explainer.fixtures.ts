/**
 * 測試 Fixture：6 個測試案例
 * 
 * 1. 長文 + (1)~(8) + 尾端全形選項（同一行空格分隔）
 * 2. 混合全/半形選項
 * 3. 獨立題（短句＋(A)~(D)）
 * 4. 缺 tips
 * 5. 模型回 note: "MISSING: options"
 * 6. 超長輸入（確保尾端選項仍在輸入裡）
 */

export const testFixtures = {
  // 測試案例 1：長文 + (1)~(8) + 尾端全形選項（同一行空格分隔）
  longPassageWithFullWidthOptions: `The development of artificial intelligence has revolutionized many aspects of modern life. From healthcare to transportation, AI systems are being integrated into various industries to improve efficiency and decision-making. However, this rapid advancement also raises important questions about ethics, privacy, and the future of work.

In healthcare, AI-powered diagnostic tools can analyze medical images with remarkable accuracy, often detecting conditions that might be missed by human eyes. These systems can process vast amounts of patient data to identify patterns and suggest treatment options. Yet, concerns about data privacy and the potential for algorithmic bias remain significant challenges.

The transportation sector has seen dramatic changes with the introduction of autonomous vehicles. These self-driving cars use complex AI algorithms to navigate roads, avoid obstacles, and make split-second decisions. While proponents argue that autonomous vehicles could reduce accidents caused by human error, skeptics worry about the reliability of these systems in unpredictable situations.

As AI continues to evolve, society must grapple with fundamental questions about the role of technology in our lives. How do we ensure that AI systems are fair and transparent? What happens to workers whose jobs are automated? These are not just technical questions but deeply human ones that require careful consideration.

(1) The main purpose of this passage is to
(2) According to the passage, AI in healthcare
(3) The author's attitude toward autonomous vehicles can be described as
(4) Which of the following is NOT mentioned as a concern about AI?
(5) The word "grapple" in paragraph 4 most likely means
(6) What can be inferred about the future of AI?
(7) The passage suggests that AI development requires
(8) Which statement best summarizes the author's view?

（Ａ）discuss the benefits and challenges of AI （Ｂ）promote the use of AI in various industries （Ｃ）warn against the dangers of AI （Ｄ）explain how AI systems work （Ｅ）describe the history of AI development （Ｆ）analyze the technical aspects of AI （Ｇ）compare different AI applications （Ｈ）predict the future of AI technology`,

  // 測試案例 2：混合全/半形選項
  mixedWidthOptions: `What is the main idea of the following passage?

Climate change is one of the most pressing issues facing humanity today. Scientists have documented rising global temperatures, melting ice caps, and increasingly extreme weather patterns. These changes are primarily driven by human activities, particularly the burning of fossil fuels and deforestation.

(A) Climate change is a natural phenomenon
(B) Human activities are the main cause of climate change
(C) Scientists disagree about climate change
(D) Climate change only affects certain regions

（Ａ）氣候變遷是自然現象 （Ｂ）人類活動是氣候變遷的主要原因 （Ｃ）科學家對氣候變遷有分歧 （Ｄ）氣候變遷只影響特定地區`,

  // 測試案例 3：獨立題（短句＋(A)~(D)）
  independentQuestion: `Choose the word that best completes the sentence:

The company's new policy was met with _____ from employees who felt their concerns were not addressed.

(A) enthusiasm
(B) resistance
(C) indifference
(D) approval`,

  // 測試案例 4：缺 tips（正常題目，但沒有 tips 欄位）
  missingTips: `Which of the following best describes the tone of the passage?

The author presents a balanced view of the topic, acknowledging both strengths and weaknesses of the argument.

(A) Critical
(B) Neutral
(C) Supportive
(D) Sarcastic`,

  // 測試案例 5：模型回 note: "MISSING: options"（模擬選項無法提取的情況）
  missingOptions: `Read the following passage and answer the question:

The concept of sustainable development has gained significant attention in recent years. It refers to meeting the needs of the present without compromising the ability of future generations to meet their own needs.

What is the main focus of sustainable development?`,

  // 測試案例 6：超長輸入（確保尾端選項仍在輸入裡）
  veryLongInput: `The history of human civilization is a complex tapestry woven from countless threads of culture, technology, and social evolution. From the earliest agricultural societies to the modern digital age, humanity has continuously adapted and transformed itself in response to changing circumstances and new discoveries.

Ancient civilizations such as Mesopotamia, Egypt, and the Indus Valley developed sophisticated systems of writing, mathematics, and governance that laid the foundations for later societies. These early cultures created monumental architecture, developed trade networks spanning vast distances, and established legal codes that influenced subsequent civilizations.

The classical period saw the rise of powerful empires in Greece, Rome, China, and India. These civilizations produced remarkable achievements in philosophy, science, art, and literature that continue to influence modern thought. The spread of ideas through trade routes and conquest facilitated cultural exchange and the development of new technologies.

The medieval period witnessed the rise of feudalism in Europe, the expansion of Islamic civilization, and the flourishing of Chinese culture under various dynasties. This era also saw significant advances in agriculture, architecture, and the arts, as well as the development of universities and the preservation of classical knowledge.

The Renaissance marked a period of renewed interest in classical learning and humanistic values. This cultural movement spread throughout Europe and led to significant advances in art, science, and exploration. The invention of the printing press revolutionized the dissemination of knowledge and contributed to the spread of new ideas.

The Industrial Revolution transformed societies through mechanization, urbanization, and new forms of economic organization. This period saw dramatic changes in living standards, social structures, and the relationship between humans and their environment. The development of new technologies and transportation systems connected distant regions and facilitated global trade.

The modern era has been characterized by rapid technological advancement, globalization, and profound social changes. The development of computers, the internet, and digital technologies has created new possibilities for communication, commerce, and cultural exchange. At the same time, these changes have raised new questions about privacy, inequality, and the future of work.

As we look to the future, humanity faces significant challenges including climate change, resource depletion, and social inequality. However, history also shows that humans have a remarkable capacity for adaptation and innovation. The solutions to these challenges will likely require cooperation, creativity, and a deep understanding of both our past and our potential.

(1) What is the main theme of this passage?
(2) According to the passage, what characterized the Industrial Revolution?
(3) The author suggests that future challenges will require
(4) Which period is described as marking renewed interest in classical learning?
(5) What role did trade routes play in the classical period?
(6) The passage implies that human civilization is characterized by
(7) What technological development revolutionized knowledge dissemination?
(8) According to the passage, what is a key characteristic of the modern era?

(A) The evolution of human civilization over time
(B) The importance of technology in human development
(C) The role of trade in cultural exchange
(D) The challenges facing modern society
(E) Mechanization and urbanization
(F) Cooperation and innovation
(G) The Renaissance
(H) Facilitating cultural exchange and technology development
(I) Continuous adaptation and transformation
(J) The printing press
(K) Rapid technological advancement and globalization
(L) The development of new forms of economic organization`,
}




