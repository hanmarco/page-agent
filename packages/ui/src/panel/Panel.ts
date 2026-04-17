import { I18n, type SupportedLanguage } from '../i18n'
import { truncate } from '../utils'
import { createCard, createReflectionLines } from './cards'
import type { AgentActivity, PanelAgentAdapter } from './types'

import styles from './Panel.module.css'

/**
 * Panel configuration
 */
export interface PanelConfig {
	language?: SupportedLanguage
	/**
	 * Whether to prompt for next task after task completion
	 * @default true
	 */
	promptForNextTask?: boolean
}

interface HeaderEntry {
	name: string
	value: string
}

interface SettingsState {
	baseURL: string
	model: string
	apiKey: string
	headers: HeaderEntry[]
}

/**
 * Agent control panel
 *
 * Architecture:
 * - History list: renders directly from agent.history (historical events)
 * - Header bar: shows activity events (transient state) and agent status
 *
 * This separation ensures data consistency - history is the single source of truth
 * for what has been done, while activity shows what is happening now.
 */
export class Panel {
	static readonly DEFAULT_BASE_URL = 'http://a2g.samsungds.net:8090/v1'
	static readonly DEFAULT_MODEL = 'glm5'

	#wrapper: HTMLElement
	#indicator: HTMLElement
	#statusText: HTMLElement
	#historySection: HTMLElement
	#expandButton: HTMLElement
	#actionButton: HTMLElement
	#inputSection: HTMLElement
	#taskInput: HTMLInputElement
	#settingsButton: HTMLButtonElement
	#settingsOverlay: HTMLElement
	#settingsCloseButton: HTMLButtonElement
	#settingsSaveButton: HTMLButtonElement
	#settingsBaseUrlInput: HTMLInputElement
	#settingsModelInput: HTMLInputElement
	#settingsApiKeyInput: HTMLInputElement
	#settingsHeadersList: HTMLElement
	#settingsAddHeaderButton: HTMLButtonElement
	#settingsFetchModelsButton: HTMLButtonElement
	#modelsDatalist: HTMLDataListElement
	#modelsSelect: HTMLSelectElement
	#modelDatalistId = 'page-agent-models-list'

	#agent: PanelAgentAdapter
	#config: PanelConfig
	#isExpanded = false
	#i18n: I18n
	#userAnswerResolver: ((input: string) => void) | null = null
	#isWaitingForUserAnswer: boolean = false
	#headerUpdateTimer: ReturnType<typeof setInterval> | null = null
	#pendingHeaderText: string | null = null
	#isAnimating = false
	#settingsState: SettingsState
	#availableModels: string[] = []

	// Event handlers (bound for removal)
	#onStatusChange = () => this.#handleStatusChange()
	#onHistoryChange = () => this.#handleHistoryChange()
	#onActivity = (e: Event) => this.#handleActivity((e as CustomEvent<AgentActivity>).detail)
	#onAgentDispose = () => this.dispose()

	get wrapper(): HTMLElement {
		return this.#wrapper
	}

	/**
	 * Create a Panel bound to an agent
	 * @param agent - Agent instance that implements PanelAgentAdapter
	 * @param config - Optional panel configuration
	 */
	constructor(agent: PanelAgentAdapter, config: PanelConfig = {}) {
		this.#agent = agent
		this.#config = config
		this.#i18n = new I18n(config.language ?? 'en-US')

		// Set up askUser callback on agent
		this.#agent.onAskUser = (question) => this.#askUser(question)

		// Create UI elements
		this.#wrapper = this.#createWrapper()
		this.#settingsOverlay = this.#createSettingsOverlay()
		this.#indicator = this.#wrapper.querySelector(`.${styles.indicator}`)!
		this.#statusText = this.#wrapper.querySelector(`.${styles.statusText}`)!
		this.#historySection = this.#wrapper.querySelector(`.${styles.historySection}`)!
		this.#expandButton = this.#wrapper.querySelector(`.${styles.expandButton}`)!
		this.#actionButton = this.#wrapper.querySelector(`.${styles.stopButton}`)!
		this.#inputSection = this.#wrapper.querySelector(`.${styles.inputSectionWrapper}`)!
		this.#taskInput = this.#wrapper.querySelector(`.${styles.taskInput}`)!
		this.#settingsButton = this.#wrapper.querySelector(`.${styles.settingsButton}`)!
		this.#settingsCloseButton = this.#settingsOverlay.querySelector(
			`.${styles.settingsCloseButton}`
		)!
		this.#settingsSaveButton = this.#settingsOverlay.querySelector(`.${styles.saveSettingsButton}`)!
		this.#settingsBaseUrlInput = this.#settingsOverlay.querySelector(
			`.${styles.settingsBaseUrlInput}`
		)!
		this.#settingsModelInput = this.#settingsOverlay.querySelector(`.${styles.settingsModelInput}`)!
		this.#settingsApiKeyInput = this.#settingsOverlay.querySelector(
			`.${styles.settingsApiKeyInput}`
		)!
		this.#settingsHeadersList = this.#settingsOverlay.querySelector(`.${styles.headersList}`)!
		this.#settingsAddHeaderButton = this.#settingsOverlay.querySelector(
			`.${styles.addHeaderButton}`
		)!
		this.#settingsFetchModelsButton = this.#settingsOverlay.querySelector(
			`.${styles.fetchModelsButton}`
		)!
		this.#modelsDatalist = this.#settingsOverlay.querySelector(`.${styles.modelsDatalist}`)!
		this.#modelsSelect = this.#settingsOverlay.querySelector(`.${styles.modelsSelect}`)!
		this.#settingsState = this.#getInitialSettings()

		// Listen to agent events
		this.#agent.addEventListener('statuschange', this.#onStatusChange)
		this.#agent.addEventListener('historychange', this.#onHistoryChange)
		this.#agent.addEventListener('activity', this.#onActivity)
		this.#agent.addEventListener('dispose', this.#onAgentDispose)

		this.#setupEventListeners()
		this.#startHeaderUpdateLoop()

		this.#showInputArea()

		this.hide() // Start hidden
	}

	// ========== Agent event handlers ==========

	/** Handle agent status change */
	#handleStatusChange(): void {
		const status = this.#agent.status

		// Map agent status to UI indicator type
		const indicatorType =
			status === 'running' ? 'thinking' : status === 'idle' ? 'thinking' : status
		this.#updateStatusIndicator(indicatorType)

		// Morph action button: running = stop (■), not running = close (X)
		if (status === 'running') {
			this.#actionButton.textContent = '■'
			this.#actionButton.title = this.#i18n.t('ui.panel.stop')
		} else {
			this.#actionButton.textContent = 'X'
			this.#actionButton.title = this.#i18n.t('ui.panel.close')
		}

		// Show/hide based on status
		if (status === 'running') {
			this.show()
			this.#hideInputArea() // Hide input while running
		}

		// Handle completion
		if (status === 'completed' || status === 'error') {
			if (!this.#isExpanded) {
				this.#expand()
			}
			if (this.#shouldShowInputArea()) {
				this.#showInputArea()
			}
		}
	}

	/** Handle agent history change - re-render history list from agent.history */
	#handleHistoryChange(): void {
		this.#renderHistory()
	}

	/**
	 * Handle agent activity - transient state for immediate UI feedback
	 * Activity events are NOT persisted in history, only used for header bar updates
	 */
	#handleActivity(activity: AgentActivity): void {
		switch (activity.type) {
			case 'thinking':
				this.#pendingHeaderText = this.#i18n.t('ui.panel.thinking')
				this.#updateStatusIndicator('thinking')
				break

			case 'executing':
				this.#pendingHeaderText = this.#getToolExecutingText(activity.tool, activity.input)
				this.#updateStatusIndicator('executing')
				break

			case 'executed':
				this.#pendingHeaderText = truncate(activity.output, 50)
				break

			case 'retrying':
				this.#pendingHeaderText = `Retrying (${activity.attempt}/${activity.maxAttempts})`
				this.#updateStatusIndicator('retrying')
				break

			case 'error':
				this.#pendingHeaderText = truncate(activity.message, 50)
				this.#updateStatusIndicator('error')
				break
		}
	}

	/**
	 * Ask for user input (internal, called by agent via onAskUser)
	 */
	#askUser(question: string): Promise<string> {
		return new Promise((resolve) => {
			// Set `waiting for user answer` state
			this.#isWaitingForUserAnswer = true
			this.#userAnswerResolver = resolve

			// Expand history panel
			if (!this.#isExpanded) {
				this.#expand()
			}

			// Add temporary question card so user can see the full question
			const tempCard = document.createElement('div')
			tempCard.innerHTML = createCard({
				icon: '❓',
				content: `Question: ${question}`,
				type: 'question',
			})
			const cardElement = tempCard.firstElementChild as HTMLElement
			cardElement.setAttribute('data-temp-card', 'true')
			this.#historySection.appendChild(cardElement)
			this.#scrollToBottom()

			this.#showInputArea(this.#i18n.t('ui.panel.userAnswerPrompt'))
		})
	}

	// ========== Public control methods ==========

	show(): void {
		this.wrapper.style.display = 'block'
		void this.wrapper.offsetHeight
		this.wrapper.style.opacity = '1'
		this.wrapper.style.transform = 'translateX(-50%) translateY(0)'
	}

	hide(): void {
		this.wrapper.style.opacity = '0'
		this.wrapper.style.transform = 'translateX(-50%) translateY(20px)'
		this.wrapper.style.display = 'none'
	}

	reset(): void {
		this.#statusText.textContent = this.#i18n.t('ui.panel.ready')
		this.#updateStatusIndicator('thinking')
		this.#renderHistory()
		this.#collapse()
		// Reset user input state
		this.#isWaitingForUserAnswer = false
		this.#userAnswerResolver = null
		// Show input area
		this.#showInputArea()
	}

	expand(): void {
		this.#expand()
	}

	collapse(): void {
		this.#collapse()
	}

	/**
	 * Dispose panel and clean up event listeners
	 */
	dispose(): void {
		// Remove agent event listeners
		this.#agent.removeEventListener('statuschange', this.#onStatusChange)
		this.#agent.removeEventListener('historychange', this.#onHistoryChange)
		this.#agent.removeEventListener('activity', this.#onActivity)
		this.#agent.removeEventListener('dispose', this.#onAgentDispose)

		// Clean up UI
		this.#isWaitingForUserAnswer = false
		this.#stopHeaderUpdateLoop()
		this.wrapper.remove()
		this.#settingsOverlay.remove()
	}

	// ========== Private methods ==========

	#getToolExecutingText(toolName: string, args: unknown): string {
		const a = args as Record<string, string | number>
		switch (toolName) {
			case 'click_element_by_index':
				return this.#i18n.t('ui.tools.clicking', { index: a.index })
			case 'input_text':
				return this.#i18n.t('ui.tools.inputting', { index: a.index })
			case 'select_dropdown_option':
				return this.#i18n.t('ui.tools.selecting', { text: a.text })
			case 'scroll':
				return this.#i18n.t('ui.tools.scrolling')
			case 'wait':
				return this.#i18n.t('ui.tools.waiting', { seconds: a.seconds })
			case 'ask_user':
				return this.#i18n.t('ui.tools.askingUser')
			case 'done':
				return this.#i18n.t('ui.tools.done')
			default:
				return this.#i18n.t('ui.tools.executing', { toolName })
		}
	}

	/**
	 * Action button handler: stop when running, close (dispose) when idle
	 */
	#handleActionButton(): void {
		if (this.#agent.status === 'running') {
			this.#agent.stop()
		} else {
			this.#agent.dispose()
		}
	}

	/**
	 * Submit task
	 */
	#submitTask() {
		const input = this.#taskInput.value.trim()
		if (!input) return

		// Hide input area
		this.#hideInputArea()

		if (this.#isWaitingForUserAnswer) {
			// Handle user input mode
			this.#handleUserAnswer(input)
		} else {
			// Execute task via agent
			this.#agent.execute(input)
		}
	}

	/**
	 * Handle user answer
	 */
	#handleUserAnswer(input: string): void {
		// Remove temporary question cards (only direct children for safety)
		Array.from(this.#historySection.children).forEach((child) => {
			if (child.getAttribute('data-temp-card') === 'true') {
				child.remove()
			}
		})

		// Reset state
		this.#isWaitingForUserAnswer = false

		// Call resolver to return user input
		if (this.#userAnswerResolver) {
			this.#userAnswerResolver(input)
			this.#userAnswerResolver = null
		}
	}

	/**
	 * Show input area
	 */
	#showInputArea(placeholder?: string): void {
		// Clear input field
		this.#taskInput.value = ''
		this.#taskInput.placeholder = placeholder || this.#i18n.t('ui.panel.taskInput')
		this.#inputSection.classList.remove(styles.hidden)
		// Focus on input field
		setTimeout(() => {
			this.#taskInput.focus()
		}, 100)
	}

	/**
	 * Hide input area
	 */
	#hideInputArea(): void {
		this.#inputSection.classList.add(styles.hidden)
	}

	/**
	 * Check if input area should be shown
	 */
	#shouldShowInputArea(): boolean {
		// Always show input area if waiting for user input
		if (this.#isWaitingForUserAnswer) return true

		const history = this.#agent.history
		if (history.length === 0) {
			return true // Initial state
		}

		const status = this.#agent.status
		const isTaskEnded = status === 'completed' || status === 'error'

		// Only show input area after task completion if configured to do so
		if (isTaskEnded) {
			return this.#config.promptForNextTask ?? true
		}

		return false
	}

	#getInitialSettings(): SettingsState {
		const agentConfig =
			this.#agent.getLLMConfig?.() ??
			(this.#agent as unknown as { config?: Record<string, unknown> }).config ??
			{}
		const rawHeaders = (agentConfig as { headers?: Record<string, string> }).headers
		const baseURLValue = (agentConfig as { baseURL?: string }).baseURL
		const modelValue = (agentConfig as { model?: string }).model

		return {
			baseURL: baseURLValue?.trim() || Panel.DEFAULT_BASE_URL,
			model: modelValue?.trim() || Panel.DEFAULT_MODEL,
			apiKey: (agentConfig as { apiKey?: string }).apiKey || '',
			headers: this.#normalizeHeaders(rawHeaders),
		}
	}

	#getDefaultHeaders(): HeaderEntry[] {
		return [
			{ name: 'Content-Type', value: 'application/json' },
			{ name: 'Accept', value: 'application/json' },
			{ name: 'x-service-id', value: 'warp-agent' },
			{ name: 'x-user-id', value: 'sss.han' },
		]
	}

	#normalizeHeaders(headers?: Record<string, string>): HeaderEntry[] {
		const entries = headers ? Object.entries(headers).map(([name, value]) => ({ name, value })) : []
		const defaults = this.#getDefaultHeaders()
		if (entries.length === 0) return defaults
		while (entries.length < 2) {
			entries.push(defaults[entries.length] ?? { name: '', value: '' })
		}
		return entries
	}

	#openSettings(): void {
		this.#settingsState = this.#getInitialSettings()
		this.#settingsBaseUrlInput.value = this.#settingsState.baseURL
		this.#settingsModelInput.value = this.#settingsState.model
		this.#settingsApiKeyInput.value = this.#settingsState.apiKey
		this.#renderModelOptions(this.#availableModels)
		this.#renderHeaderInputs(this.#settingsState.headers)
		this.#settingsOverlay.classList.remove(styles.hidden)
	}

	#closeSettings(): void {
		this.#settingsOverlay.classList.add(styles.hidden)
	}

	#renderHeaderInputs(headers: HeaderEntry[]): void {
		this.#settingsHeadersList.innerHTML = ''
		headers.forEach((header, index) => {
			this.#settingsHeadersList.appendChild(this.#createHeaderRow(header, index))
		})
		this.#ensureHeaderRows()
	}

	#renderModelOptions(models: string[]): void {
		const unique = Array.from(new Set(models.filter(Boolean)))
		this.#modelsDatalist.innerHTML = ''
		unique.forEach((m) => {
			const option = document.createElement('option')
			option.value = m
			this.#modelsDatalist.appendChild(option)
		})

		this.#modelsSelect.innerHTML = ''
		const placeholder = document.createElement('option')
		placeholder.value = ''
		placeholder.textContent = this.#i18n.t('ui.panel.modelPlaceholder')
		this.#modelsSelect.appendChild(placeholder)
		unique.forEach((m) => {
			const opt = document.createElement('option')
			opt.value = m
			opt.textContent = m
			this.#modelsSelect.appendChild(opt)
		})
	}

	#createHeaderRow(header: HeaderEntry, index: number): HTMLElement {
		const row = document.createElement('div')
		row.className = styles.headerRow

		const nameInput = document.createElement('input')
		nameInput.type = 'text'
		nameInput.className = `${styles.settingsInput} ${styles.headerInput}`
		nameInput.placeholder = this.#i18n.t('ui.panel.headerNamePlaceholder')
		nameInput.value = header.name

		const valueInput = document.createElement('input')
		valueInput.type = 'text'
		valueInput.className = `${styles.settingsInput} ${styles.headerInput}`
		valueInput.placeholder = this.#i18n.t('ui.panel.headerValuePlaceholder')
		valueInput.value = header.value

		const removeButton = document.createElement('button')
		removeButton.type = 'button'
		removeButton.className = styles.settingsIconButton
		removeButton.textContent = '−'
		removeButton.title = this.#i18n.t('ui.panel.removeHeader')
		removeButton.addEventListener('click', (e) => {
			e.stopPropagation()
			row.remove()
			this.#ensureHeaderRows()
		})

		if (index === 0) {
			row.classList.add(styles.headerRowFirst)
		}

		row.appendChild(nameInput)
		row.appendChild(valueInput)
		row.appendChild(removeButton)

		return row
	}

	#ensureHeaderRows(): void {
		while (this.#settingsHeadersList.children.length < 2) {
			this.#addHeaderRow({ name: '', value: '' })
		}
	}

	#addHeaderRow(header: HeaderEntry): void {
		this.#settingsHeadersList.appendChild(
			this.#createHeaderRow(header, this.#settingsHeadersList.children.length)
		)
	}

	#collectHeadersFromUI(): Record<string, string> {
		const headers: Record<string, string> = {}
		const rows = Array.from(this.#settingsHeadersList.children) as HTMLElement[]
		rows.forEach((row) => {
			const inputs = row.querySelectorAll('input')
			const name = inputs[0]?.value.trim() || ''
			const value = inputs[1]?.value || ''
			if (name) {
				headers[name] = value
			}
		})

		if (Object.keys(headers).length === 0) {
			for (const { name, value } of this.#getDefaultHeaders()) {
				headers[name] = value
			}
		}

		return headers
	}

	async #fetchModels(): Promise<void> {
		const baseURL = this.#settingsBaseUrlInput.value.trim()
		const apiKey = this.#settingsApiKeyInput.value.trim()
		const headers = this.#collectHeadersFromUI()

		if (!baseURL) {
			this.#pendingHeaderText = this.#i18n.t('ui.panel.settingsMissingFields')
			this.#updateStatusIndicator('error')
			return
		}

		const normalizedBase = baseURL.replace(/\/+$/, '')
		const url = `${normalizedBase}/models`
		const requestHeaders: Record<string, string> = { ...headers }
		if (apiKey && !requestHeaders.Authorization) {
			requestHeaders.Authorization = `Bearer ${apiKey}`
		}

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: requestHeaders,
			})
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`)
			}
			const data = await response.json()
			const models =
				(data?.data as { id?: string; name?: string; model?: string }[]) ||
				(data?.models as { id?: string; name?: string; model?: string }[]) ||
				[]

			const names = models
				.map((m) => m?.id || m?.name || m?.model || '')
				.filter((v): v is string => Boolean(v))

			this.#availableModels = names
			this.#renderModelOptions(names)
			this.#pendingHeaderText = this.#i18n.t('ui.panel.modelsFetched')
			this.#updateStatusIndicator('executed')
		} catch (error) {
			console.error(error)
			this.#pendingHeaderText = this.#i18n.t('ui.panel.settingsError')
			this.#updateStatusIndicator('error')
		}
	}

	#handleSaveSettings(): void {
		const baseURL = this.#settingsBaseUrlInput.value.trim() || this.#settingsState.baseURL
		const model = this.#settingsModelInput.value.trim() || this.#settingsState.model
		const apiKey = this.#settingsApiKeyInput.value.trim()
		const headers = this.#collectHeadersFromUI()

		if (!baseURL || !model) {
			this.#pendingHeaderText = this.#i18n.t('ui.panel.settingsMissingFields')
			this.#updateStatusIndicator('error')
			return
		}

		this.#settingsState = {
			baseURL,
			model,
			apiKey,
			headers: this.#normalizeHeaders(headers),
		}

		if (!this.#agent.updateLLMConfig) {
			this.#pendingHeaderText = this.#i18n.t('ui.panel.settingsError')
			this.#updateStatusIndicator('error')
			return
		}

		try {
			this.#agent.updateLLMConfig?.({
				baseURL,
				model,
				apiKey: apiKey || undefined,
				headers,
			})
			this.#pendingHeaderText = this.#i18n.t('ui.panel.settingsSaved')
			this.#updateStatusIndicator('executed')
			this.#closeSettings()
		} catch (error) {
			console.error(error)
			this.#pendingHeaderText = this.#i18n.t('ui.panel.settingsError')
			this.#updateStatusIndicator('error')
		}
	}

	#createWrapper(): HTMLElement {
		const taskInputMaxLength = 1000
		const wrapper = document.createElement('div')
		wrapper.id = 'page-agent-runtime_agent-panel'
		wrapper.className = styles.wrapper
		wrapper.setAttribute('data-browser-use-ignore', 'true')
		wrapper.setAttribute('data-page-agent-ignore', 'true')

		wrapper.innerHTML = `
			<div class="${styles.background}"></div>
			<div class="${styles.historySectionWrapper}">
				<div class="${styles.historySection}">
					<div class="${styles.historyItem}">
						<div class="${styles.historyContent}">
							<span class="${styles.statusIcon}">🧠</span>
							<span>${this.#i18n.t('ui.panel.waitingPlaceholder')}</span>
						</div>
					</div>
				</div>
			</div>
			<div class="${styles.header}">
				<div class="${styles.statusSection}">
					<div class="${styles.indicator} ${styles.thinking}"></div>
					<div class="${styles.statusText}">${this.#i18n.t('ui.panel.ready')}</div>
				</div>
				<div class="${styles.controls}">
					<button class="${styles.controlButton} ${styles.expandButton}" title="${this.#i18n.t('ui.panel.expand')}">
						▼
					</button>
					<button class="${styles.controlButton} ${styles.stopButton}" title="${this.#i18n.t('ui.panel.close')}">
						X
					</button>
				</div>
			</div>
			<div class="${styles.inputSectionWrapper} ${styles.hidden}">
				<div class="${styles.inputSection}">
					<button 
						type="button"
						class="${styles.controlButton} ${styles.settingsButton}"
						title="${this.#i18n.t('ui.panel.settings')}"
					>
						⚙️
					</button>
					<input 
						type="text" 
						class="${styles.taskInput}" 
						name="page-agent-task"
						autocomplete="off"
						autocorrect="off"
						autocapitalize="none"
						spellcheck="false"
						inputmode="text"
						maxlength="${taskInputMaxLength}"
					/>
				</div>
			</div>
		`

		document.body.appendChild(wrapper)
		return wrapper
	}

	#createSettingsOverlay(): HTMLElement {
		const overlay = document.createElement('div')
		overlay.className = `${styles.settingsOverlay} ${styles.hidden}`
		overlay.setAttribute('data-browser-use-ignore', 'true')
		overlay.setAttribute('data-page-agent-ignore', 'true')

		overlay.innerHTML = `
			<div class="${styles.settingsCard}">
				<div class="${styles.settingsHeader}">
					<div class="${styles.settingsTitle}">${this.#i18n.t('ui.panel.settings')}</div>
					<button 
						type="button" 
						class="${styles.settingsIconButton} ${styles.settingsCloseButton}" 
						title="${this.#i18n.t('ui.panel.closeSettings')}"
					>
						×
					</button>
				</div>
				<div class="${styles.settingsBody}">
					<label class="${styles.settingsLabel}">${this.#i18n.t('ui.panel.baseURL')}</label>
					<input type="text" class="${styles.settingsInput} ${styles.settingsBaseUrlInput}" placeholder="${this.#i18n.t('ui.panel.baseURLPlaceholder')}" />

					<label class="${styles.settingsLabel}">${this.#i18n.t('ui.panel.model')}</label>
					<div class="${styles.modelRow}">
						<input
							type="text"
							class="${styles.settingsInput} ${styles.settingsModelInput}"
							list="${this.#modelDatalistId}"
							placeholder="${this.#i18n.t('ui.panel.modelPlaceholder')}"
						/>
						<select class="${styles.settingsInput} ${styles.modelsSelect}">
							<option value="">${this.#i18n.t('ui.panel.modelPlaceholder')}</option>
						</select>
						<button 
							type="button" 
							class="${styles.settingsIconButton} ${styles.fetchModelsButton}"
							title="${this.#i18n.t('ui.panel.fetchModels')}"
							aria-label="${this.#i18n.t('ui.panel.fetchModels')}"
						>
							⟳
						</button>
					</div>
					<datalist id="${this.#modelDatalistId}" class="${styles.modelsDatalist}"></datalist>

					<label class="${styles.settingsLabel}">${this.#i18n.t('ui.panel.apiKey')}</label>
					<input type="password" class="${styles.settingsInput} ${styles.settingsApiKeyInput}" placeholder="${this.#i18n.t('ui.panel.apiKeyPlaceholder')}" />

					<div class="${styles.settingsGroup}">
						<div class="${styles.settingsGroupHeader}">
							<span class="${styles.settingsLabel}">${this.#i18n.t('ui.panel.customHeaders')}</span>
							<button type="button" class="${styles.settingsIconButton} ${styles.addHeaderButton}" title="${this.#i18n.t('ui.panel.addHeader')}">+</button>
						</div>
						<div class="${styles.headersList}"></div>
					</div>
				</div>
				<div class="${styles.settingsFooter}">
					<button type="button" class="${styles.settingsPrimaryButton} ${styles.saveSettingsButton}">
						${this.#i18n.t('ui.panel.saveSettings')}
					</button>
				</div>
			</div>
		`

		document.body.appendChild(overlay)
		return overlay
	}

	#setupEventListeners(): void {
		// Click header area to expand/collapse
		const header = this.wrapper.querySelector(`.${styles.header}`)!
		header.addEventListener('click', (e) => {
			// Don't trigger expand/collapse if clicking on buttons
			if ((e.target as HTMLElement).closest(`.${styles.controlButton}`)) {
				return
			}
			this.#toggle()
		})

		// Expand button
		this.#expandButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#toggle()
		})

		// Action button (stop / close)
		this.#actionButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#handleActionButton()
		})

		// Settings button
		this.#settingsButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#openSettings()
		})

		this.#settingsCloseButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#closeSettings()
		})

		this.#settingsSaveButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#handleSaveSettings()
		})

		this.#settingsAddHeaderButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#addHeaderRow({ name: '', value: '' })
		})

		this.#settingsFetchModelsButton.addEventListener('click', async (e) => {
			e.stopPropagation()
			await this.#fetchModels()
		})

		this.#modelsSelect.addEventListener('change', (e) => {
			const target = e.target as HTMLSelectElement
			if (target.value) {
				this.#settingsModelInput.value = target.value
			}
		})

		// Submit on Enter key in input field
		this.#taskInput.addEventListener('keydown', (e) => {
			if (e.isComposing) return // Ignore IME composition keys
			if (e.key === 'Enter') {
				e.preventDefault()
				this.#submitTask()
			}
		})

		// Prevent input area click event bubbling
		this.#inputSection.addEventListener('click', (e) => {
			e.stopPropagation()
		})
	}

	#toggle(): void {
		if (this.#isExpanded) {
			this.#collapse()
		} else {
			this.#expand()
		}
	}

	#expand(): void {
		this.#isExpanded = true
		this.wrapper.classList.add(styles.expanded)
		this.#expandButton.textContent = '▲'
	}

	#collapse(): void {
		this.#isExpanded = false
		this.wrapper.classList.remove(styles.expanded)
		this.#expandButton.textContent = '▼'
	}

	/**
	 * Start periodic header update loop
	 */
	#startHeaderUpdateLoop(): void {
		// Check every 450ms (same as total animation duration)
		this.#headerUpdateTimer = setInterval(() => {
			this.#checkAndUpdateHeader()
		}, 450)
	}

	/**
	 * Stop periodic header update loop
	 */
	#stopHeaderUpdateLoop(): void {
		if (this.#headerUpdateTimer) {
			clearInterval(this.#headerUpdateTimer)
			this.#headerUpdateTimer = null
		}
	}

	/**
	 * Check if header needs update and trigger animation if not currently animating
	 */
	#checkAndUpdateHeader(): void {
		// If no pending text or currently animating, skip
		if (!this.#pendingHeaderText || this.#isAnimating) {
			return
		}

		// If text is already displayed, clear pending and skip
		if (this.#statusText.textContent === this.#pendingHeaderText) {
			this.#pendingHeaderText = null
			return
		}

		// Start animation
		const textToShow = this.#pendingHeaderText
		this.#pendingHeaderText = null
		this.#animateTextChange(textToShow)
	}

	/**
	 * Animate text change with fade out/in effect
	 */
	#animateTextChange(newText: string): void {
		this.#isAnimating = true

		// Fade out current text
		this.#statusText.classList.add(styles.fadeOut)

		setTimeout(() => {
			// Update text content
			this.#statusText.textContent = newText

			// Fade in new text
			this.#statusText.classList.remove(styles.fadeOut)
			this.#statusText.classList.add(styles.fadeIn)

			setTimeout(() => {
				this.#statusText.classList.remove(styles.fadeIn)
				this.#isAnimating = false
			}, 300)
		}, 150) // Half the duration of fade out animation
	}

	#updateStatusIndicator(
		type: 'thinking' | 'executing' | 'executed' | 'retrying' | 'completed' | 'error'
	): void {
		// Clear all status classes
		this.#indicator.className = styles.indicator

		// Add corresponding status class
		this.#indicator.classList.add(styles[type])
	}

	#scrollToBottom(): void {
		// Execute in next event loop to ensure DOM update completion
		setTimeout(() => {
			this.#historySection.scrollTop = this.#historySection.scrollHeight
		}, 0)
	}

	/**
	 * Render history directly from agent.history
	 *
	 * Renders:
	 * 1. Task (first item, from agent.task)
	 * 2. Reflection cards (evaluation, memory, next_goal)
	 * 3. Tool execution with output
	 * 4. Observations
	 */
	#renderHistory(): void {
		const items: string[] = []

		// 1. Task card (always first)
		const task = this.#agent.task
		if (task) {
			items.push(this.#createTaskCard(task))
		}

		// 2. Render each history event
		const history = this.#agent.history
		for (const event of history) {
			items.push(...this.#createHistoryCards(event))
		}

		this.#historySection.innerHTML = items.join('')
		this.#scrollToBottom()
	}

	#createTaskCard(task: string): string {
		return createCard({ icon: '🎯', content: task, type: 'input' })
	}

	/** Create cards for a history event */
	#createHistoryCards(event: PanelAgentAdapter['history'][number]): string[] {
		const cards: string[] = []
		const meta =
			event.type === 'step' && event.stepIndex !== undefined
				? this.#i18n.t('ui.panel.step', {
						number: (event.stepIndex + 1).toString(),
					})
				: undefined

		if (event.type === 'step') {
			// Reflection card
			if (event.reflection) {
				const lines = createReflectionLines(event.reflection)
				if (lines.length > 0) {
					cards.push(createCard({ icon: '🧠', content: lines, meta }))
				}
			}

			// Action card
			const action = event.action
			if (action) {
				cards.push(...this.#createActionCards(action, meta))
			}
		} else if (event.type === 'observation') {
			cards.push(
				createCard({ icon: '👁️', content: event.content || '', meta, type: 'observation' })
			)
		} else if (event.type === 'user_takeover') {
			cards.push(createCard({ icon: '👤', content: 'User takeover', meta, type: 'input' }))
		} else if (event.type === 'retry') {
			const retryInfo = `${event.message || 'Retrying'} (${event.attempt}/${event.maxAttempts})`
			cards.push(createCard({ icon: '🔄', content: retryInfo, meta, type: 'observation' }))
		} else if (event.type === 'error') {
			cards.push(
				createCard({ icon: '❌', content: event.message || 'Error', meta, type: 'observation' })
			)
		}

		return cards
	}

	/** Create cards for an action */
	#createActionCards(
		action: { name: string; input: unknown; output: string },
		meta?: string
	): string[] {
		const cards: string[] = []

		if (action.name === 'done') {
			const input = action.input as { text?: string }
			const text = input.text || action.output || ''
			if (text) {
				cards.push(createCard({ icon: '🤖', content: text, meta, type: 'output' }))
			}
		} else if (action.name === 'ask_user') {
			const input = action.input as { question?: string }
			const answer = action.output.replace(/^User answered:\s*/i, '')
			cards.push(
				createCard({
					icon: '❓',
					content: `Question: ${input.question || ''}`,
					meta,
					type: 'question',
				})
			)
			cards.push(createCard({ icon: '💬', content: `Answer: ${answer}`, meta, type: 'input' }))
		} else {
			const toolText = this.#getToolExecutingText(action.name, action.input)
			cards.push(createCard({ icon: '🔨', content: toolText, meta }))
			if (action.output?.length > 0) {
				cards.push(createCard({ icon: '🔨', content: action.output, meta, type: 'output' }))
			}
		}

		return cards
	}
}
