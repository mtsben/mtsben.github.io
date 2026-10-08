/* Choose a CV independently of the portfolio's interface language. */
document.addEventListener('DOMContentLoaded', () => {
  const viewer = document.getElementById('resume-viewer');
  const download = document.getElementById('resume-download');
  const label = document.getElementById('resume-download-label');
  const buttons = [...document.querySelectorAll('[data-resume-language]')];
  if (!viewer || !download || !label || !buttons.length) return;

  const frenchInterface = document.documentElement.lang === 'fr';

  function selectVersion(button) {
    const language = button.dataset.resumeLanguage;
    const pdf = button.dataset.pdf;
    buttons.forEach((choice) => {
      choice.setAttribute('aria-pressed', String(choice === button));
    });
    if (viewer.getAttribute('src') !== pdf) viewer.setAttribute('src', pdf);
    viewer.title = frenchInterface
      ? `CV de Mathis Benchikh — version ${language === 'fr' ? 'française' : 'anglaise'}`
      : `Mathis Benchikh’s CV — ${language === 'fr' ? 'French' : 'English'} version`;
    download.href = pdf;
    download.download = `Mathis_Benchikh_CV_${language.toUpperCase()}.pdf`;
    label.textContent = `${frenchInterface ? 'Télécharger le PDF' : 'Download PDF'} (${language.toUpperCase()})`;
  }

  buttons.forEach((button) => button.addEventListener('click', () => selectVersion(button)));
  selectVersion(buttons.find((button) => button.dataset.resumeLanguage === document.documentElement.lang) || buttons[0]);
});
