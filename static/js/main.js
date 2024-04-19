import { navToggle } from './navigation.js';
import { focusInput } from './focusInput.js';
import { changePlaceholder } from './changePlaceholder.js';
import { setLangChange } from './setLangChange.js';
import { drawEpidemiologyTable } from './epidemiology.js';

navToggle();
focusInput();
changePlaceholder();
setLangChange();
if (window.location.pathname === '/epidemiology') {
  drawEpidemiologyTable();
}
