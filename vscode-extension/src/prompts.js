const CUSTOM_MODEL_VALUE = '__custom_model__';
const CUSTOM_TOOL_VALUE = '__custom_tool__';
const OMIT_TOOL_VALUE = '__omit_tool__';

const taskTypeDetails = [
  ['bug_fix', 'Fix broken behavior'],
  ['feature', 'Add new product behavior'],
  ['frontend_ui', 'Build or style interface work'],
  ['refactor', 'Restructure existing code'],
  ['test_generation', 'Add or update tests'],
  ['documentation', 'Write or revise docs'],
  ['code_review', 'Review or inspect changes'],
  ['debugging', 'Investigate a problem'],
  ['migration', 'Move data or upgrade systems'],
  ['dependency_update', 'Update packages or libraries'],
  ['performance', 'Improve speed or resource use'],
  ['security', 'Address a security concern'],
  ['data_analysis', 'Analyze metrics or datasets'],
  ['setup', 'Configure tooling or environment'],
  ['other', 'Record work outside the main categories'],
  ['unknown', 'Keep task type unspecified'],
];

const finalOutcomeDetails = [
  ['accepted', 'Used with no material rework'],
  ['partially_accepted', 'Useful, but needed edits'],
  ['rejected', 'Not used'],
  ['unknown', 'Outcome not recorded'],
];

const providerModels = {
  openai: ['gpt-5'],
  anthropic: ['claude-sonnet-4.5'],
  google: ['gemini-cli'],
  local: ['local-model'],
};

const toolDetails = [
  ['Codex', 'OpenAI coding agent'],
  ['Claude Code', 'Anthropic coding agent'],
  ['Cursor', 'Editor-native AI coding workflow'],
  ['Gemini CLI', 'Google terminal coding workflow'],
  ['Aider', 'Git-focused terminal pair programmer'],
  ['Continue', 'Editor extension workflow'],
];

const taskTypeItems = taskTypeDetails.map(([value, description]) => ({
  label: humanizeEnum(value),
  description,
  value,
}));

const finalOutcomeItems = finalOutcomeDetails.map(([value, description]) => ({
  label: humanizeEnum(value),
  description,
  value,
}));

const toolItems = [
  ...toolDetails.map(([value, description]) => ({
    label: value,
    description,
    value,
  })),
  {
    label: 'Other tool...',
    description: 'Enter a custom tool or agent name',
    value: CUSTOM_TOOL_VALUE,
  },
  {
    label: 'Skip tool',
    description: 'Do not record a tool for this session',
    value: OMIT_TOOL_VALUE,
  },
];

async function pickTaskType(ui) {
  const choice = await ui.showQuickPick(taskTypeItems, {
    title: 'OpenSasa: Task Type',
    placeHolder: 'Select the task type for this session',
    ignoreFocusOut: true,
  });
  return choice?.value;
}

async function pickFinalOutcome(ui) {
  const choice = await ui.showQuickPick(finalOutcomeItems, {
    title: 'OpenSasa: Final Outcome',
    placeHolder: 'Select the result of this session',
    ignoreFocusOut: true,
  });
  return choice?.value;
}

async function pickModelId(ui, provider) {
  const choice = await ui.showQuickPick(getModelItems(provider), {
    title: 'OpenSasa: Model',
    placeHolder: `Select a model for ${provider}`,
    ignoreFocusOut: true,
  });

  if (!choice) {
    return undefined;
  }

  if (choice.value !== CUSTOM_MODEL_VALUE) {
    return choice.value;
  }

  return readTrimmedInput(ui, {
    prompt: `Model ID for ${provider}`,
    placeHolder: 'gpt-5',
    ignoreFocusOut: true,
  });
}

async function pickTool(ui) {
  const choice = await ui.showQuickPick(toolItems, {
    title: 'OpenSasa: Tool',
    placeHolder: 'Select the coding tool or agent used',
    ignoreFocusOut: true,
  });

  if (!choice) {
    return undefined;
  }

  if (choice.value === OMIT_TOOL_VALUE) {
    return null;
  }

  if (choice.value !== CUSTOM_TOOL_VALUE) {
    return choice.value;
  }

  return readTrimmedInput(ui, {
    prompt: 'Tool or agent name',
    placeHolder: 'Codex',
    ignoreFocusOut: true,
  });
}

function getModelItems(provider) {
  const providerKey = provider.trim().toLowerCase();
  const models = providerModels[providerKey] ?? [];
  return [
    ...models.map((value) => ({
      label: value,
      description: 'Common local choice',
      value,
    })),
    {
      label: 'Other model ID...',
      description: 'Enter a custom provider model identifier',
      value: CUSTOM_MODEL_VALUE,
    },
  ];
}

async function readTrimmedInput(ui, options) {
  const value = await ui.showInputBox(options);
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function humanizeEnum(value) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

module.exports = {
  CUSTOM_MODEL_VALUE,
  CUSTOM_TOOL_VALUE,
  OMIT_TOOL_VALUE,
  finalOutcomeItems,
  getModelItems,
  pickFinalOutcome,
  pickModelId,
  pickTaskType,
  pickTool,
  taskTypeItems,
  toolItems,
};
