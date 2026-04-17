// English translations (base/reference language)
const enUS = {
	ui: {
		panel: {
			ready: 'Ready',
			thinking: 'Thinking...',
			taskInput: 'Enter new task, describe steps in detail, press Enter to submit',
			userAnswerPrompt: 'Please answer the question above, press Enter to submit',
			taskTerminated: 'Task terminated',
			taskCompleted: 'Task completed',
			userAnswer: 'User answer: {{input}}',
			question: 'Question: {{question}}',
			waitingPlaceholder: 'Waiting for task to start...',
			stop: 'Stop',
			close: 'Close',
			closeSettings: 'Close settings',
			settings: 'Settings',
			saveSettings: 'Save settings',
			settingsSaved: 'Settings saved',
			settingsError: 'Failed to save settings',
			settingsMissingFields: 'Base URL and model are required',
			baseURL: 'Base URL',
			baseURLPlaceholder: 'https://api.openai.com/v1',
			model: 'Model',
			modelPlaceholder: 'gpt-5.1',
			apiKey: 'API Key',
			apiKeyPlaceholder: 'sk-...',
			customHeaders: 'Custom headers',
			addHeader: 'Add header',
			removeHeader: 'Remove header',
			headerNamePlaceholder: 'Header name',
			headerValuePlaceholder: 'Header value',
			expand: 'Expand history',
			collapse: 'Collapse history',
			step: 'Step {{number}}',
		},
		tools: {
			clicking: 'Clicking element [{{index}}]...',
			inputting: 'Inputting text to element [{{index}}]...',
			selecting: 'Selecting option "{{text}}"...',
			scrolling: 'Scrolling page...',
			waiting: 'Waiting {{seconds}} seconds...',
			askingUser: 'Asking user...',
			done: 'Task done',
			clicked: '🖱️ Clicked element [{{index}}]',
			inputted: '⌨️ Inputted text "{{text}}"',
			selected: '☑️ Selected option "{{text}}"',
			scrolled: '🛞 Page scrolled',
			waited: '⌛️ Wait completed',
			executing: 'Executing {{toolName}}...',
			resultSuccess: 'success',
			resultFailure: 'failed',
			resultError: 'error',
		},
		errors: {
			elementNotFound: 'No interactive element found at index {{index}}',
			taskRequired: 'Task description is required',
			executionFailed: 'Task execution failed',
			notInputElement: 'Element is not an input or textarea',
			notSelectElement: 'Element is not a select element',
			optionNotFound: 'Option "{{text}}" not found',
		},
	},
} as const

// Chinese translations (must match the structure of enUS)
const zhCN = {
	ui: {
		panel: {
			ready: '准备就绪',
			thinking: '正在思考...',
			taskInput: '输入新任务，详细描述步骤，回车提交',
			userAnswerPrompt: '请回答上面问题，回车提交',
			taskTerminated: '任务已终止',
			taskCompleted: '任务结束',
			userAnswer: '用户回答: {{input}}',
			question: '询问: {{question}}',
			waitingPlaceholder: '等待任务开始...',
			stop: '终止',
			close: '关闭',
			closeSettings: '关闭设置',
			settings: '设置',
			saveSettings: '保存设置',
			settingsSaved: '设置已保存',
			settingsError: '保存设置失败',
			settingsMissingFields: 'Base URL 和模型不能为空',
			baseURL: 'Base URL',
			baseURLPlaceholder: 'https://api.openai.com/v1',
			model: '模型',
			modelPlaceholder: 'gpt-5.1',
			apiKey: 'API Key',
			apiKeyPlaceholder: 'sk-...',
			customHeaders: '自定义请求头',
			addHeader: '添加请求头',
			removeHeader: '移除请求头',
			headerNamePlaceholder: 'Header 名称',
			headerValuePlaceholder: 'Header 值',
			expand: '展开历史',
			collapse: '收起历史',
			step: '步骤 {{number}}',
		},
		tools: {
			clicking: '正在点击元素 [{{index}}]...',
			inputting: '正在输入文本到元素 [{{index}}]...',
			selecting: '正在选择选项 "{{text}}"...',
			scrolling: '正在滚动页面...',
			waiting: '等待 {{seconds}} 秒...',
			askingUser: '正在询问用户...',
			done: '结束任务',
			clicked: '🖱️ 已点击元素 [{{index}}]',
			inputted: '⌨️ 已输入文本 "{{text}}"',
			selected: '☑️ 已选择选项 "{{text}}"',
			scrolled: '🛞 页面滚动完成',
			waited: '⌛️ 等待完成',
			executing: '正在执行 {{toolName}}...',
			resultSuccess: '成功',
			resultFailure: '失败',
			resultError: '错误',
		},
		errors: {
			elementNotFound: '未找到索引为 {{index}} 的交互元素',
			taskRequired: '任务描述不能为空',
			executionFailed: '任务执行失败',
			notInputElement: '元素不是输入框或文本域',
			notSelectElement: '元素不是选择框',
			optionNotFound: '未找到选项 "{{text}}"',
		},
	},
} as const

// Korean translations
const koKR = {
	ui: {
		panel: {
			ready: '준비 완료',
			thinking: '생각 중...',
			taskInput: '새 작업을 입력하고 자세히 설명한 뒤 Enter를 누르세요',
			userAnswerPrompt: '위 질문에 답변을 입력하고 Enter를 누르세요',
			taskTerminated: '작업이 종료되었습니다',
			taskCompleted: '작업이 완료되었습니다',
			userAnswer: '사용자 답변: {{input}}',
			question: '질문: {{question}}',
			waitingPlaceholder: '작업 시작을 기다리는 중...',
			stop: '중단',
			close: '닫기',
			closeSettings: '설정 닫기',
			settings: '설정',
			saveSettings: '설정 저장',
			settingsSaved: '설정이 저장되었습니다',
			settingsError: '설정 저장에 실패했습니다',
			settingsMissingFields: 'Base URL과 모델은 필수입니다',
			baseURL: 'Base URL',
			baseURLPlaceholder: 'https://api.openai.com/v1',
			model: '모델',
			modelPlaceholder: 'gpt-5.1',
			apiKey: 'API Key',
			apiKeyPlaceholder: 'sk-...',
			customHeaders: '커스텀 헤더',
			addHeader: '헤더 추가',
			removeHeader: '헤더 제거',
			headerNamePlaceholder: '헤더 이름',
			headerValuePlaceholder: '헤더 값',
			expand: '히스토리 펼치기',
			collapse: '히스토리 접기',
			step: '단계 {{number}}',
		},
		tools: {
			clicking: '요소 [{{index}}] 클릭 중...',
			inputting: '요소 [{{index}}]에 텍스트 입력 중...',
			selecting: '"{{text}}" 옵션 선택 중...',
			scrolling: '페이지 스크롤 중...',
			waiting: '{{seconds}}초 대기 중...',
			askingUser: '사용자에게 묻는 중...',
			done: '작업 완료',
			clicked: '🖱️ 요소 [{{index}}] 클릭 완료',
			inputted: '⌨️ 텍스트 "{{text}}" 입력 완료',
			selected: '☑️ "{{text}}" 옵션 선택 완료',
			scrolled: '🛞 페이지 스크롤 완료',
			waited: '⌛️ 대기 완료',
			executing: '{{toolName}} 실행 중...',
			resultSuccess: '성공',
			resultFailure: '실패',
			resultError: '에러',
		},
		errors: {
			elementNotFound: '인덱스 {{index}} 의 요소를 찾지 못했습니다',
			taskRequired: '작업 설명은 필수입니다',
			executionFailed: '작업 실행에 실패했습니다',
			notInputElement: '요소가 입력창이나 텍스트 영역이 아닙니다',
			notSelectElement: '요소가 선택 박스가 아닙니다',
			optionNotFound: '옵션 "{{text}}"을 찾지 못했습니다',
		},
	},
} as const

// Type definitions generated from English base structure (but with string values)
type DeepStringify<T> = {
	[K in keyof T]: T[K] extends string ? string : T[K] extends object ? DeepStringify<T[K]> : T[K]
}

export type TranslationSchema = DeepStringify<typeof enUS>

// Utility type: Extract all nested paths from translation object
type NestedKeyOf<ObjectType extends object> = {
	[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
		? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
		: `${Key}`
}[keyof ObjectType & (string | number)]

// Extract all possible key paths from translation structure
export type TranslationKey = NestedKeyOf<TranslationSchema>

// Parameterized translation types
export type TranslationParams = Record<string, string | number>

export const locales = {
	'en-US': enUS,
	'zh-CN': zhCN,
	'ko-KR': koKR,
} as const

export type SupportedLanguage = keyof typeof locales
