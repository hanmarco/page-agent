// Demo build (auto-init with demo LLM, for quick testing)
// Dynamically resolves to the current host so it works on any deployment
export const CDN_DEMO_URL = `${window.location.origin}${import.meta.env.BASE_URL}page-agent.demo.js`
export const CDN_DEMO_CN_URL = CDN_DEMO_URL

// Demo LLM for website testing (homepage quick trial uses flash)
export const DEMO_MODEL = 'qwen3.5-flash'
export const DEMO_BASE_URL = 'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run'
// export const DEMO_API_KEY = ''
