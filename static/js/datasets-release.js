(function () {
  const releaseCells = Array.from(document.querySelectorAll('[data-release-datasource]'));
  if (!releaseCells.length) {
    return;
  }

  const parseRows = (text) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|'))
      .filter((line) => !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line))
      .map((line) => line.split('|').slice(1, -1).map((col) => col.trim()))
      .filter((columns) => columns.length === 3)
      .filter((columns) => !(columns[0].toLowerCase() === 'file' && columns[1].toLowerCase() === 'datasource'))
      .map((columns) => ({
        file: columns[0],
        datasource: columns[1],
        update: columns[2]
      }));
  };

  const mapKey = (file, datasource) => `${file}||${datasource}`;

  const getReleaseTxtUrl = () => {
    const host = window.location.hostname;
    if (host === 'nanbyodata.jp' || host === 'www.nanbyodata.jp') {
      return 'https://nanbyodata.jp/download/latest/RELEASE.txt';
    }
    if (host === 'dev-nanbyodata.dbcls.jp' || host === 'localhost' || host === '127.0.0.1') {
      return 'https://dev-nanbyodata.dbcls.jp/download/latest/RELEASE.txt';
    }
    return '/download/latest/RELEASE.txt';
  };

  fetch(getReleaseTxtUrl())
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch RELEASE.txt');
      }
      return response.text();
    })
    .then((text) => {
      const rowMap = new Map();
      parseRows(text).forEach((row) => {
        if (!row.file || !row.datasource || !row.update) {
          return;
        }
        rowMap.set(mapKey(row.file, row.datasource), row.update);
      });

      releaseCells.forEach((cell) => {
        const datasource = (cell.dataset.releaseDatasource || '').trim();
        const file = (cell.dataset.releaseFile || '').trim();
        const update = rowMap.get(mapKey(file, datasource));
        if (update) {
          cell.textContent = update;
        }
      });
    })
    .catch(() => {
      // Keep fallback values in HTML when RELEASE.txt is unavailable.
    });
})();
