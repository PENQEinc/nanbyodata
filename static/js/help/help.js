// 環境ごとの設定を一元管理
const ENV_CONFIG = (() => {
  const origin = window.location.origin;
  // 環境ごとの設定マップ
  const configs = {
    'https://nanbyodata.jp': {
      branch: 'master',
      useGithub: true,
    },
    'https://dev-nanbyodata.dbcls.jp': {
      branch: 'dev',
      useGithub: true,
    },
    default: {
      useGithub: false,
    },
  };

  // 該当する環境の設定を返す、なければデフォルト設定
  return configs[origin] || configs['default'];
})();

// 環境設定から各URLを生成
const FAQ_DATA_URL = ENV_CONFIG.useGithub
  ? `https://raw.githubusercontent.com/aidrd/nanbyodata/refs/heads/${ENV_CONFIG.branch}/static/data/faq.json`
  : '/static/data/faq.json';

async function loadFAQ() {
  try {
    const response = await fetch(FAQ_DATA_URL);
    const faqData = await response.json();
    const locale =
      document.querySelector('.language-select')?.value ||
      (document.documentElement.lang === 'ja' ? 'ja' : 'en');
    const faqContainer = document.getElementById('faq-container');

    if (!faqContainer) {
      console.error('FAQ container not found');
      return;
    }

    let html = '';

    // 言語の値を取得する関数（指定言語がない場合は英語を返す）
    const getLocalizedValue = (obj, key) => {
      if (!obj || !obj[key]) return '';
      return obj[key][locale] || obj[key]['en'] || '';
    };

    faqData.sections.forEach((section) => {
      // サブセクションがない場合（その他セクションなど）にクラスを追加
      const hasSubsections =
        section.subsections && section.subsections.length > 0;
      const sectionClass = hasSubsections
        ? 'faq-section'
        : 'faq-section faq-section-no-subsections';
      html += `<div class="${sectionClass}">`;
      html += `<h2 class="faq-section-title">${getLocalizedValue(
        section,
        'title'
      )}</h2>`;

      // サブセクションがある場合
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach((subsection) => {
          html += `<div class="faq-subsection">`;
          html += `<h3 class="faq-subsection-title">${getLocalizedValue(
            subsection,
            'title'
          )}</h3>`;

          if (subsection.items && subsection.items.length > 0) {
            subsection.items.forEach((item, index) => {
              const itemId = `faq-${section.id}-${subsection.id}-${index}`;
              html += `
                <div class="faq-item">
                  <button class="faq-question" type="button" data-toggle="collapse" data-target="#${itemId}" aria-expanded="false" aria-controls="${itemId}">
                    <span>${getLocalizedValue(item, 'question')}</span>
                    <i class="fas fa-chevron-right faq-icon"></i>
                  </button>
                  <div class="faq-answer collapse" id="${itemId}">
                    ${getLocalizedValue(item, 'answer')}
                  </div>
                </div>
              `;
            });
          }

          html += `</div>`;
        });
      } else if (section.items && section.items.length > 0) {
        // サブセクションがない場合（Otherセクションなど）
        section.items.forEach((item, index) => {
          const itemId = `faq-${section.id}-${index}`;
          html += `
            <div class="faq-item">
              <button class="faq-question" type="button" data-toggle="collapse" data-target="#${itemId}" aria-expanded="false" aria-controls="${itemId}">
                <span>${getLocalizedValue(item, 'question')}</span>
                <i class="fas fa-chevron-right faq-icon"></i>
              </button>
              <div class="faq-answer collapse" id="${itemId}">
                ${getLocalizedValue(item, 'answer')}
              </div>
            </div>
          `;
        });
      }

      html += `</div>`;
    });

    faqContainer.innerHTML = html;

    // Bootstrapのcollapseイベントに合わせてアイコンの回転を制御
    const faqQuestions = faqContainer.querySelectorAll('.faq-question');
    faqQuestions.forEach((question) => {
      const targetId = question.getAttribute('data-target');
      const targetElement = document.querySelector(targetId);
      const icon = question.querySelector('.faq-icon');

      if (targetElement && icon && typeof $ !== 'undefined') {
        // Bootstrapのcollapseイベントをリッスン
        $(targetElement).on('show.bs.collapse', function () {
          icon.classList.add('expanded');
          question.setAttribute('aria-expanded', 'true');
        });

        $(targetElement).on('hide.bs.collapse', function () {
          icon.classList.remove('expanded');
          question.setAttribute('aria-expanded', 'false');
        });
      } else if (targetElement && icon) {
        // jQueryが利用できない場合のフォールバック
        targetElement.addEventListener('show.bs.collapse', function () {
          icon.classList.add('expanded');
          question.setAttribute('aria-expanded', 'true');
        });

        targetElement.addEventListener('hide.bs.collapse', function () {
          icon.classList.remove('expanded');
          question.setAttribute('aria-expanded', 'false');
        });
      }
    });
  } catch (error) {
    console.error('Error loading FAQ:', error);
    const faqContainer = document.getElementById('faq-container');
    if (faqContainer) {
      faqContainer.innerHTML = '<p>FAQの読み込みに失敗しました。</p>';
    }
  }
}

// 初期表示時に実行
if (window.location.pathname === '/help') {
  document.addEventListener('DOMContentLoaded', loadFAQ);

  // 言語切り替え時に再実行
  document
    .querySelector('.language-select')
    ?.addEventListener('change', loadFAQ);
}
