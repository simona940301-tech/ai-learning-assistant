// 台灣大學院校和科系資料
export interface University {
  id: string
  name: string
  departments: Department[]
}

export interface Department {
  id: string
  name: string
}

export const universities: University[] = [
  {
    id: 'ntu',
    name: '國立台灣大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械工程學系' },
      { id: 'ce', name: '土木工程學系' },
      { id: 'che', name: '化學工程學系' },
      { id: 'math', name: '數學系' },
      { id: 'physics', name: '物理學系' },
      { id: 'chemistry', name: '化學系' },
      { id: 'bio', name: '生命科學系' },
      { id: 'med', name: '醫學系' },
      { id: 'law', name: '法律學系' },
      { id: 'econ', name: '經濟學系' },
      { id: 'business', name: '工商管理學系' },
      { id: 'chinese', name: '中國文學系' },
      { id: 'english', name: '外國語文學系' },
    ],
  },
  {
    id: 'nthu',
    name: '國立清華大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '動力機械工程學系' },
      { id: 'math', name: '數學系' },
      { id: 'physics', name: '物理學系' },
      { id: 'chemistry', name: '化學系' },
      { id: 'life', name: '生命科學系' },
      { id: 'econ', name: '經濟學系' },
      { id: 'chinese', name: '中國文學系' },
      { id: 'english', name: '外國語文學系' },
    ],
  },
  {
    id: 'nctu',
    name: '國立交通大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械工程學系' },
      { id: 'mse', name: '材料科學與工程學系' },
      { id: 'ie', name: '工業工程與管理學系' },
      { id: 'math', name: '應用數學系' },
      { id: 'physics', name: '應用物理學系' },
      { id: 'econ', name: '管理科學系' },
    ],
  },
  {
    id: 'ncku',
    name: '國立成功大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械工程學系' },
      { id: 'ce', name: '土木工程學系' },
      { id: 'che', name: '化學工程學系' },
      { id: 'med', name: '醫學系' },
      { id: 'pharm', name: '藥學系' },
      { id: 'law', name: '法律學系' },
      { id: 'econ', name: '經濟學系' },
      { id: 'chinese', name: '中國文學系' },
    ],
  },
  {
    id: 'ntust',
    name: '國立台灣科技大學',
    departments: [
      { id: 'cs', name: '資訊工程系' },
      { id: 'ee', name: '電機工程系' },
      { id: 'me', name: '機械工程系' },
      { id: 'ce', name: '營建工程系' },
      { id: 'che', name: '化學工程系' },
      { id: 'ie', name: '工業管理系' },
      { id: 'business', name: '企業管理系' },
    ],
  },
  {
    id: 'ntnu',
    name: '國立台灣師範大學',
    departments: [
      { id: 'edu', name: '教育學系' },
      { id: 'chinese', name: '國文學系' },
      { id: 'english', name: '英語學系' },
      { id: 'math', name: '數學系' },
      { id: 'physics', name: '物理學系' },
      { id: 'chemistry', name: '化學系' },
      { id: 'bio', name: '生命科學系' },
      { id: 'pe', name: '體育學系' },
      { id: 'music', name: '音樂學系' },
      { id: 'art', name: '美術學系' },
    ],
  },
  {
    id: 'nccu',
    name: '國立政治大學',
    departments: [
      { id: 'law', name: '法律學系' },
      { id: 'econ', name: '經濟學系' },
      { id: 'business', name: '企業管理學系' },
      { id: 'finance', name: '財務管理學系' },
      { id: 'accounting', name: '會計學系' },
      { id: 'chinese', name: '中國文學系' },
      { id: 'english', name: '英國語文學系' },
      { id: 'journalism', name: '新聞學系' },
      { id: 'ad', name: '廣告學系' },
      { id: 'psychology', name: '心理學系' },
    ],
  },
  {
    id: 'ntut',
    name: '國立台北科技大學',
    departments: [
      { id: 'cs', name: '資訊工程系' },
      { id: 'ee', name: '電機工程系' },
      { id: 'me', name: '機械工程系' },
      { id: 'ce', name: '土木工程系' },
      { id: 'che', name: '化學工程與生物科技系' },
      { id: 'ie', name: '工業工程與管理系' },
      { id: 'business', name: '經營管理系' },
    ],
  },
  {
    id: 'nchu',
    name: '國立中興大學',
    departments: [
      { id: 'cs', name: '資訊科學與工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械工程學系' },
      { id: 'ce', name: '土木工程學系' },
      { id: 'chem', name: '化學系' },
      { id: 'bio', name: '生命科學系' },
      { id: 'vet', name: '獸醫學系' },
      { id: 'agri', name: '農藝學系' },
      { id: 'law', name: '法律學系' },
      { id: 'econ', name: '應用經濟學系' },
    ],
  },
  {
    id: 'nsysu',
    name: '國立中山大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械與機電工程學系' },
      { id: 'chem', name: '化學系' },
      { id: 'physics', name: '物理學系' },
      { id: 'math', name: '應用數學系' },
      { id: 'business', name: '企業管理學系' },
      { id: 'finance', name: '財務管理學系' },
      { id: 'chinese', name: '中國文學系' },
      { id: 'english', name: '外國語文學系' },
    ],
  },
  {
    id: 'ncu',
    name: '國立中央大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械工程學系' },
      { id: 'ce', name: '土木工程學系' },
      { id: 'chem', name: '化學學系' },
      { id: 'physics', name: '物理學系' },
      { id: 'math', name: '數學系' },
      { id: 'econ', name: '經濟學系' },
      { id: 'chinese', name: '中國文學系' },
      { id: 'english', name: '英美語文學系' },
    ],
  },
  {
    id: 'ntou',
    name: '國立台灣海洋大學',
    departments: [
      { id: 'ocean', name: '海洋環境資訊系' },
      { id: 'fisheries', name: '水產養殖學系' },
      { id: 'food', name: '食品科學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械與機電工程學系' },
      { id: 'cs', name: '資訊工程學系' },
      { id: 'shipping', name: '航運管理學系' },
      { id: 'logistics', name: '運輸科學系' },
    ],
  },
  {
    id: 'ntpu',
    name: '國立台北大學',
    departments: [
      { id: 'law', name: '法律學系' },
      { id: 'econ', name: '經濟學系' },
      { id: 'business', name: '企業管理學系' },
      { id: 'accounting', name: '會計學系' },
      { id: 'finance', name: '金融與合作經營學系' },
      { id: 'statistics', name: '統計學系' },
      { id: 'chinese', name: '中國文學系' },
      { id: 'english', name: '應用外語學系' },
      { id: 'social', name: '社會學系' },
      { id: 'psychology', name: '心理學系' },
    ],
  },
  {
    id: 'ncyu',
    name: '國立嘉義大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械與能源工程學系' },
      { id: 'bio', name: '生物資源學系' },
      { id: 'agri', name: '農藝學系' },
      { id: 'vet', name: '獸醫學系' },
      { id: 'food', name: '食品科學系' },
      { id: 'business', name: '企業管理學系' },
    ],
  },
  {
    id: 'ndhu',
    name: '國立東華大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'math', name: '應用數學系' },
      { id: 'physics', name: '應用物理學系' },
      { id: 'chem', name: '化學系' },
      { id: 'bio', name: '生命科學系' },
      { id: 'chinese', name: '中國語文學系' },
      { id: 'english', name: '英美語文學系' },
      { id: 'econ', name: '經濟學系' },
      { id: 'business', name: '企業管理學系' },
    ],
  },
  {
    id: 'nptu',
    name: '國立屏東大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'edu', name: '教育學系' },
      { id: 'chinese', name: '中國語文學系' },
      { id: 'english', name: '英語學系' },
      { id: 'business', name: '企業管理學系' },
      { id: 'pe', name: '體育學系' },
    ],
  },
  {
    id: 'nuk',
    name: '國立高雄大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'law', name: '法律學系' },
      { id: 'econ', name: '應用經濟學系' },
      { id: 'business', name: '企業管理學系' },
      { id: 'finance', name: '金融管理學系' },
      { id: 'chinese', name: '中國文學系' },
      { id: 'english', name: '西洋語文學系' },
    ],
  },
  {
    id: 'nfu',
    name: '國立虎尾科技大學',
    departments: [
      { id: 'cs', name: '資訊工程系' },
      { id: 'ee', name: '電機工程系' },
      { id: 'me', name: '機械設計工程系' },
      { id: 'ie', name: '工業管理系' },
      { id: 'business', name: '企業管理系' },
    ],
  },
  {
    id: 'ncut',
    name: '國立台中科技大學',
    departments: [
      { id: 'cs', name: '資訊工程系' },
      { id: 'ee', name: '電機工程系' },
      { id: 'business', name: '企業管理系' },
      { id: 'accounting', name: '會計資訊系' },
      { id: 'finance', name: '財務金融系' },
      { id: 'chinese', name: '應用中文系' },
      { id: 'english', name: '應用英語系' },
    ],
  },
  {
    id: 'ncyut',
    name: '國立雲林科技大學',
    departments: [
      { id: 'cs', name: '資訊工程系' },
      { id: 'ee', name: '電機工程系' },
      { id: 'me', name: '機械工程系' },
      { id: 'ce', name: '營建工程系' },
      { id: 'ie', name: '工業工程與管理系' },
      { id: 'business', name: '企業管理系' },
      { id: 'accounting', name: '會計系' },
    ],
  },
  {
    id: 'nuu',
    name: '國立聯合大學',
    departments: [
      { id: 'cs', name: '資訊工程學系' },
      { id: 'ee', name: '電機工程學系' },
      { id: 'me', name: '機械工程學系' },
      { id: 'ce', name: '土木與防災工程學系' },
      { id: 'chem', name: '化學工程學系' },
      { id: 'chinese', name: '華語文學系' },
      { id: 'english', name: '應用外語學系' },
    ],
  },
  {
    id: 'other',
    name: '其他',
    departments: [
      { id: 'custom', name: '自訂科系' },
    ],
  },
]

// 搜尋大學
export function searchUniversities(query: string): University[] {
  if (!query.trim()) return universities
  const lowerQuery = query.toLowerCase()
  return universities.filter(uni => 
    uni.name.toLowerCase().includes(lowerQuery)
  )
}

// 搜尋科系
export function searchDepartments(universityId: string, query: string): Department[] {
  const university = universities.find(u => u.id === universityId)
  if (!university) return []
  if (!query.trim()) return university.departments
  const lowerQuery = query.toLowerCase()
  return university.departments.filter(dept =>
    dept.name.toLowerCase().includes(lowerQuery)
  )
}

// 根據 ID 獲取大學
export function getUniversityById(id: string): University | undefined {
  return universities.find(u => u.id === id)
}

// 根據 ID 獲取科系
export function getDepartmentById(universityId: string, departmentId: string): Department | undefined {
  const university = getUniversityById(universityId)
  return university?.departments.find(d => d.id === departmentId)
}

