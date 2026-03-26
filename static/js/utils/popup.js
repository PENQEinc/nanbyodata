const openPopupBtns = document.querySelectorAll('.open-popup-btn');
const downloadBtn = openPopupBtns[0];
const shareBtn = openPopupBtns[1];
const popupViews = document.querySelectorAll('.popup-view');
const downloadPopup = popupViews[0];
const sharePopup = popupViews[1];

export const popup = () => {
  function togglePopup(popupId, isOpen) {
    const popup = document.querySelector(popupId);
    const activeButton = Array.from(openPopupBtns).find(
      (button) => button.getAttribute('aria-controls') === popupId.substring(1),
    );
    popup.setAttribute('aria-hidden', !isOpen);
    activeButton.setAttribute('aria-expanded', isOpen);
  }

  openPopupBtns.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const popupId = '#' + button.getAttribute('aria-controls');
      if (!button.getAttribute('aria-controls')) return;
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      togglePopup(popupId, !isOpen);
    });
  });

  // popupを閉じる
  document.addEventListener('click', function (e) {
    const isOpenPopupBtn = e.target.closest('.open-popup-btn');
    const isInsidePopup = e.target.closest('.popup-view');

    // 別のpopup buttonクリックした時に他のpopupを閉じる
    if (isOpenPopupBtn) {
      if (
        isOpenPopupBtn === downloadBtn &&
        shareBtn.getAttribute('aria-expanded') === 'true'
      ) {
        shareBtn.setAttribute('aria-expanded', false);
        sharePopup.setAttribute('aria-hidden', true);
        return;
      } else if (
        isOpenPopupBtn === shareBtn &&
        downloadBtn.getAttribute('aria-expanded') === 'true'
      ) {
        downloadBtn.setAttribute('aria-expanded', false);
        downloadPopup.setAttribute('aria-hidden', true);
        return;
      }
    }

    // popup外をクリックした時に閉じる
    document.querySelectorAll('.popup-view').forEach((popup) => {
      if (isOpenPopupBtn || isInsidePopup) {
        return;
      } else {
        popup.parentElement
          .querySelector('.open-popup-btn')
          .setAttribute('aria-expanded', false);
        popup.setAttribute('aria-hidden', true);
      }
    });
  });
};

// Share Link
function updateShareLink() {
  const shareLinkElement = document.querySelector('.summary-share .share-link');
  shareLinkElement.textContent = window.location.href;
}
document.addEventListener('DOMContentLoaded', updateShareLink);
document.querySelectorAll('#temp-side-navigation .nav-link').forEach((link) => {
  link.addEventListener('click', () => setTimeout(updateShareLink, 0));
});

async function copyToClipboard() {
  const shareLink = window.location.href;
  const copyButton = document.querySelector('.summary-share button.copy');
  copyButton.textContent = 'Copied!';
  await navigator.clipboard.writeText(shareLink);
  setTimeout(() => (copyButton.textContent = 'Copy'), 1000);
}
function openMailer() {
  const shareLink = window.location.href;
  window.location.href = `mailto:?body=${shareLink}`;
}
document
  .querySelector('.summary-share button.copy')
  .addEventListener('click', copyToClipboard);
document
  .querySelector('.summary-share button.email')
  .addEventListener('click', openMailer);
