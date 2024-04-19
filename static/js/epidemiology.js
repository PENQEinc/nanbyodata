import { epidemiologyColumns, convertColumntoText } from './paginationColumns.js';

export const drawEpidemiologyTable = () => {
  const tableView = document.querySelector('#epidemiology-table');
  updateElementWithTable(tableView, convertColumntoText(epidemiologyColumns));
}
/**
 * Updates the specified HTML element with a table using the provided object URL and columns.
 * @param {HTMLElement} element - The HTML element to be updated for the table.
 * @param {string} columns - The columns configuration for the table.
 */
function updateElementWithTable(element, columns) {
  element.innerHTML = `
    <togostanza-pagination-table
      data-url="https://pubcasefinder.dbcls.jp/sparqlist/api/nanbyodata_get_stats_on_patient_number"
      data-type="json"
      custom-css-url="https://togostanza.github.io/togostanza-themes/contrib/nanbyodata.css"
      fixed-columns="1"
      page-size-option="350"
      page-slider="false"
      columns="${columns}"
    ></togostanza-pagination-table>
  `;
}
