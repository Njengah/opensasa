const PRIVACY_NOTICE_KEY = 'opensasa.privacyNoticeShown.v1';
const PRIVACY_NOTICE_MESSAGE = 'OpenSasa stays local: it records safe metadata in your local database. No source code, private prompts, model responses, exact file paths, or raw terminal output are uploaded by this extension.';

async function maybeShowPrivacyNotice(ui, state) {
  if (state.get(PRIVACY_NOTICE_KEY)) {
    return false;
  }

  await ui.showInformationMessage(PRIVACY_NOTICE_MESSAGE);
  await state.update(PRIVACY_NOTICE_KEY, true);
  return true;
}

module.exports = {
  PRIVACY_NOTICE_KEY,
  PRIVACY_NOTICE_MESSAGE,
  maybeShowPrivacyNotice,
};
