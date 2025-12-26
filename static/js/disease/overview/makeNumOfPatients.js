import { createObjectUrlFromData } from '../../utils/stanzaUtils.js';
import { convertColumnToText } from '../../utils/stanzaColumns.js';

export function makeNumOfPatients(data) {
  const chartTypeSelect = document.getElementById('num-of-patients-graph');
  if (!data || data.length <= 1) {
    const overviewSection = chartTypeSelect.closest('.overview-section');
    overviewSection.remove();
    return;
  }

  if (chartTypeSelect) {
    chartTypeSelect.addEventListener('change', function () {
      toggleChartDisplay(chartTypeSelect.value);
    });
  }

  initializeCharts(data);
  toggleChartDisplay(chartTypeSelect ? chartTypeSelect.value : 'line');
}

function initializeCharts(data) {
  const targetDiv = document.getElementById('temp-num-of-patients');
  if (!targetDiv) return;

  targetDiv.style.overflowX = 'auto';
  targetDiv.style.overflowY = 'hidden';

  const objectUrl = createObjectUrlFromData(data);
  if (!objectUrl) {
    console.error('Error: objectUrl is undefined or invalid.');
    return;
  }

  const stanzaWidth = data.length * 100;
  const maxValue = Math.max(...data.map((item) => item.num_of_patients));

  // テーブル用のカラム定義
  const tableColumns = [
    { id: 'year', label: 'Year' },
    { id: 'num_of_patients', label: '# of certificate holders' },
  ];
  const columnsText = convertColumnToText(tableColumns);

  targetDiv.innerHTML = `
    <togostanza-barchart
      data-url="${objectUrl}"
      data-type="json"
      category="year"
      value="num_of_patients"
      category-title="Year"
      value-title="# of certificate holders"
      chart-type="stacked"
      width="${stanzaWidth}"
      height="200"
      legend="true"
      xaxis-placement="bottom"
      yaxis-placement="left"
      xlabel-padding="10"
      ylabel-padding="5"
      xlabel-alignment="center"
      ylabel-alignment="right"
      padding-inner=".8"
      padding-outer=".5"
      bar-width="0.8"
      legend-title="Categories"
      xgrid="false"
      ygrid="true"
      xtick="false"
      ytick="true"
      xlabel-max-width="200"
      ylabel-max-width="200"
      style="display: none;">
    </togostanza-barchart>

    <togostanza-linechart
      data-url="${objectUrl}"
      data-type="json"
      axis-x-key="year"
      axis-x-scale="linear"
      axis-x-placement="bottom"
      axis-x-title="Year"
      axis-x-title_padding="40"
      axis-x-title_visible="true"
      axis-x-ticks_label_angle="0"
      axis-x-ticks_interval="1"
      axis-y-range_max="${maxValue + maxValue * 0.2}"
      axis-y-range_min="0"
      axis-y-key="num_of_patients"
      axis-y-scale="linear"
      axis-y-placement="left"
      axis-y-title="# of certificate holders"
      axis-y-title_padding="60"
      axis-y-ticks_label_angle="0"
      axis-y-ticks_labels_format=","
      node-size="10"
      legend-title="Year"
      tooltip="{{num_of_patients}}"
      group-key="group"
      >
    </togostanza-linechart>

    <togostanza-pagination-table
      data-url="${objectUrl}"
      data-type="json"
      data-unavailable_message="No data found."
      custom-css-url=""
      width=""
      fixed-columns="1"
      padding-inner=".8"
      padding-outer=".5"
      page-size-option="100"
      page-slider="false"
      columns='${columnsText}'
      style="display: none;">
    </togostanza-pagination-table>
  `;

  // カスタムスタイルを適用
  const barChart = targetDiv.querySelector('togostanza-barchart');
  const lineChart = targetDiv.querySelector('togostanza-linechart');

  if (barChart) {
    barChart.style.setProperty('--togostanza-series-0-color', '#29697a');
    barChart.style.setProperty('--togostanza-title-font-size', '14');
    barChart.style.setProperty('--togostanza-label-font-size', '14');
  }

  if (lineChart) {
    lineChart.style.setProperty('--togostanza-theme-series_0_color', '#29697a');
    lineChart.style.setProperty('--togostanza-canvas-height', '250');
    lineChart.style.setProperty('--togostanza-canvas-width', `${stanzaWidth}`);
    lineChart.style.setProperty('--togostanza-canvas-padding', '10 40 40 60');
    lineChart.style.setProperty('--togostanza-fonts-font_size_default', '14');
    lineChart.style.setProperty('--togostanza-fonts-font_size_small', '12');
  }

  addScript('https://togostanza.github.io/metastanza/barchart.js');
  addScript('https://togostanza.github.io/metastanza-devel/linechart.js');
  addScript('https://togostanza.github.io/metastanza/pagination-table.js');
}

function addScript(src) {
  const scriptElement = document.createElement('script');
  scriptElement.type = 'module';
  scriptElement.src = src;
  scriptElement.async = true;
  document.body.appendChild(scriptElement);
}

function toggleChartDisplay(selectedChartType) {
  const barChart = document.querySelector('togostanza-barchart');
  const lineChart = document.querySelector('togostanza-linechart');
  const tableChart = document.querySelector('togostanza-pagination-table');

  if (selectedChartType === 'bar') {
    barChart.style.display = 'block';
    lineChart.style.display = 'none';
    tableChart.style.display = 'none';
  } else if (selectedChartType === 'line') {
    barChart.style.display = 'none';
    lineChart.style.display = 'block';
    tableChart.style.display = 'none';
  } else if (selectedChartType === 'table') {
    barChart.style.display = 'none';
    lineChart.style.display = 'none';
    tableChart.style.display = 'block';
  }
}
