// ─── Settings — thin re-export shim ──────────────────────────────────────────
// The actual implementation has been split into src/components/settings/.
// This file exists so existing imports (App.jsx, etc.) continue to work
// without path changes.
// ─────────────────────────────────────────────────────────────────────────────
export { default, default as Settings } from './settings/index.jsx';
export { RecurringScreen } from './settings/RecurringScreen.jsx';
export { ListEditor }      from './settings/ListEditor.jsx';
export { ShareModal }      from './settings/ShareModal.jsx';
export { RecurringEditor } from './settings/RecurringEditor.jsx';
export { GeneralSettings } from './settings/GeneralSettings.jsx';
export { AboutScreen }     from './settings/AboutScreen.jsx';
export { BudgetEditor }    from './settings/BudgetEditor.jsx';
