// ===============================
// 設定：API は外部、ページ遷移はローカル
// ===============================
const API_BASE = 'http://pubcasefinder.bits.cc'; // API のみ外部
const URL_GET_PANEL_UPSTREAM_HIERARCHY = `${API_BASE}/common_nanbyo_get_panel_hierarchy`;
const URL_GET_PANEL_DESCENDANT = `${API_BASE}/common_nanbyo_get_panel_descendant`;

let lang = 'ja';
let nando_id = '';
let currentSelectedNandoId = null;
// スクロール位置を保存（選択時の自動スクロールを防ぐため）
let savedScrollLeft = 0;

// 特定ノードをクリックしても遷移しないためのスキップリスト
const SKIP_LIST = ['NANDO:0000001'];

// -------------------------------
// ツリーデータ整形・ソート
// -------------------------------
function _sort_treeview_data_by_nando_id(data) {
  data.sort((a, b) => a.nando_id.localeCompare(b.nando_id));
  data.forEach((node) => {
    if (node.children && node.children.length > 0) {
      _sort_treeview_data_by_nando_id(node.children);
    }
  });
}

function _create_treeview_data(json_data, currentLang) {
  const ret_arr = [];
  for (const key in json_data) {
    const t = key.split('--');
    const obj = {
      isFirstTimeLoad: true,
      nando_id: t[0],
      num_child: t[1],
      name: t[2] && t[2].length > 0 ? t[2] : t[0],
      lang: currentLang || lang,
    };

    if (Number(t[1]) === 0) {
      obj.displayName = obj.name;
      obj.isParent = false;
      obj.open = false; // 葉ノードは展開不可
    } else {
      obj.displayName = `${obj.name} <span class="treeview-decendant-num treeview-descendant-num">(${obj.num_child})</span>`;
      obj.isParent = true;
    }

    if (typeof json_data[key] === 'object') {
      obj.open = true;
      obj.children = _create_treeview_data(json_data[key], currentLang);
    }
    ret_arr.push(obj);
  }
  return ret_arr;
}

// -------------------------------
// URLから現在の疾患IDを取得
// -------------------------------
function _getCurrentNandoIdFromUrl() {
  const urlObj = new URL(window.location.href);
  const q = urlObj.searchParams;
  const qNando = q.get('nando_id');
  if (qNando) {
    return qNando;
  }
  const path = urlObj.pathname;
  const idx = path.indexOf('NANDO:');
  if (idx !== -1) {
    return decodeURIComponent(path.slice(idx));
  }
  return null;
}

function _applyHighlightFromUrl() {
  const currentNandoId = _getCurrentNandoIdFromUrl();
  if (!currentNandoId) return;

  const container = $('.treeview-container');
  const savedScrollLeft = container.length > 0 ? container.scrollLeft() : 0;
  const savedScrollTop = container.length > 0 ? container.scrollTop() : 0;

  const allLinks = $('.treeview-container .ztree li a');

  allLinks.removeClass('curSelectedNode');

  allLinks.each(function () {
    const $link = $(this);
    const titleId = $link.attr('title');
    if (titleId === currentNandoId) {
      $link.addClass('curSelectedNode');
    }
  });

  if (zTreeObj) {
    const targetNode = zTreeObj.getNodesByParam(
      'nando_id',
      currentNandoId,
      null
    )[0];
    if (targetNode) {
      zTreeObj.cancelSelectedNode();
      zTreeObj.selectNode(targetNode, true, false);
      currentSelectedNandoId = currentNandoId;

      requestAnimationFrame(() => {
        if (container.length > 0) {
          container.scrollLeft(savedScrollLeft);
          container.scrollTop(savedScrollTop);
        }
        requestAnimationFrame(() => {
          if (container.length > 0) {
            container.scrollLeft(savedScrollLeft);
            container.scrollTop(savedScrollTop);
          }
        });
      });
    }
  }

  if (container.length > 0) {
    requestAnimationFrame(() => {
      container.scrollLeft(savedScrollLeft);
      container.scrollTop(savedScrollTop);
      requestAnimationFrame(() => {
        container.scrollLeft(savedScrollLeft);
        container.scrollTop(savedScrollTop);
      });
    });
  }
}

let isExpandingParentNodes = false;
let manuallyCollapsedNodes = new Set();

function _expandParentNodesForSelectedNode(zTree, targetId) {
  if (!zTree || !targetId || isExpandingParentNodes) return;

  const container = $('.treeview-container');
  const savedScrollLeft = container.length > 0 ? container.scrollLeft() : 0;
  const savedScrollTop = container.length > 0 ? container.scrollTop() : 0;

  isExpandingParentNodes = true;

  try {
    const targetNode = zTree.getNodesByParam('nando_id', targetId, null)[0];
    if (!targetNode) {
      setTimeout(() => {
        if (!isExpandingParentNodes) {
          const retryNode = zTree.getNodesByParam(
            'nando_id',
            targetId,
            null
          )[0];
          if (retryNode) {
            isExpandingParentNodes = true;
            _expandParentNodesForSelectedNode(zTree, targetId);
          }
        }
      }, 100);
      isExpandingParentNodes = false;
      return;
    }

    let parentNode = targetNode.getParentNode();
    while (parentNode) {
      if (!parentNode.open && !manuallyCollapsedNodes.has(parentNode.tId)) {
        if (parentNode.isFirstTimeLoad) {
          zTree.reAsyncChildNodes(parentNode, 'refresh');
          parentNode.isFirstTimeLoad = false;
        }
        zTree.expandNode(parentNode, true, false, false);

        if (container.length > 0) {
          container.scrollLeft(savedScrollLeft);
          container.scrollTop(savedScrollTop);
        }
      }
      parentNode = parentNode.getParentNode();
    }

    const directParent = targetNode.getParentNode();
    if (directParent) {
      if (!directParent.open && !manuallyCollapsedNodes.has(directParent.tId)) {
        zTree.expandNode(directParent, true, false, false);

        if (container.length > 0) {
          container.scrollLeft(savedScrollLeft);
          container.scrollTop(savedScrollTop);
        }
      }

      if (directParent.isFirstTimeLoad) {
        zTree.reAsyncChildNodes(directParent, 'refresh');
        directParent.isFirstTimeLoad = false;
      } else if (!directParent.children || directParent.children.length === 0) {
        zTree.reAsyncChildNodes(directParent, 'refresh');
      }
    }

    if (container.length > 0) {
      container.scrollLeft(savedScrollLeft);
      container.scrollTop(savedScrollTop);

      requestAnimationFrame(() => {
        container.scrollLeft(savedScrollLeft);
        container.scrollTop(savedScrollTop);
        requestAnimationFrame(() => {
          container.scrollLeft(savedScrollLeft);
          container.scrollTop(savedScrollTop);
          requestAnimationFrame(() => {
            container.scrollLeft(savedScrollLeft);
            container.scrollTop(savedScrollTop);
          });
        });
      });
    }
  } finally {
    setTimeout(() => {
      isExpandingParentNodes = false;

      if (container.length > 0) {
        container.scrollLeft(savedScrollLeft);
        container.scrollTop(savedScrollTop);
      }
    }, 500);
  }
}

function _highlight_upstream_treeview_startNode(zTree, nodes, targetId) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].nando_id === targetId) {
      zTree.selectNode(nodes[i], true, false);
      currentSelectedNandoId = targetId;

      setTimeout(() => {
        _applyHighlightFromUrl();
      }, 0);

      setTimeout(() => {
        _expandParentNodesForSelectedNode(zTree, targetId);
      }, 100);

      return;
    }
    if (nodes[i].isParent && nodes[i].children) {
      _highlight_upstream_treeview_startNode(
        zTree,
        nodes[i].children,
        targetId
      );
    }
  }
}

function _onClick_handler(selectedId) {
  const u = new URL(window.location.href);

  const existingParams = new URLSearchParams(u.search);
  existingParams.delete('lang');

  let next = `${location.origin}/disease/${selectedId}`;
  if (existingParams.toString()) {
    next += `?${existingParams.toString()}`;
  }

  window.location.href = next;
}

let zTreeObj = null;

function init_ui_upstream_trace(startId, upstream_trace_data, currentLang) {
  const langToUse =
    currentLang ||
    (() => {
      const urlObj = new URL(window.location.href);
      const q = urlObj.searchParams;
      const urlLang = q.get('lang');
      return urlLang === 'ja' || urlLang === 'en' ? urlLang : lang;
    })();

  lang = langToUse;

  const treeview_data = _create_treeview_data(upstream_trace_data, langToUse);
  _sort_treeview_data_by_nando_id(treeview_data);

  const setting = {
    view: {
      dblClickExpand: false,
      showIcon: false,
      nameIsHTML: true,
      showLine: false,
      selectedMulti: false,
      expandSpeed: 'fast',
      addDiyDom: function (treeId, treeNode) {},
    },
    async: {
      enable: true,
      type: 'get',
      url: URL_GET_PANEL_DESCENDANT,
      autoParam: ['nando_id', 'lang'],
    },
    callback: {
      beforeClick: function (treeId, treeNode) {
        return true;
      },
      onAsyncSuccess: function (event, treeId, treeNode, msg) {
        if (isExpandingParentNodes) {
          return;
        }

        const container = $('.treeview-container');
        const savedScrollLeft =
          container.length > 0 ? container.scrollLeft() : 0;
        const savedScrollTop = container.length > 0 ? container.scrollTop() : 0;

        setTimeout(() => {
          const currentNandoId = _getCurrentNandoIdFromUrl();
          if (currentNandoId && !isExpandingParentNodes) {
            _expandParentNodesForSelectedNode(zTreeObj, currentNandoId);

            _applyHighlightFromUrl();

            if (container.length > 0) {
              container.scrollLeft(savedScrollLeft);
              container.scrollTop(savedScrollTop);
              requestAnimationFrame(() => {
                container.scrollLeft(savedScrollLeft);
                container.scrollTop(savedScrollTop);
                requestAnimationFrame(() => {
                  container.scrollLeft(savedScrollLeft);
                  container.scrollTop(savedScrollTop);
                });
              });
            }
          }
        }, 50);
      },
      onClick: function (event, treeId, treeNode) {
        const container = $('.treeview-container');
        if (container.length > 0) {
          savedScrollLeft = container.scrollLeft();
        }

        if (treeNode.isParent) {
          if (treeNode.isFirstTimeLoad) {
            zTreeObj.reAsyncChildNodes(treeNode, 'refresh');
            treeNode.isFirstTimeLoad = false;
          }

          const isExpanded = treeNode.open;

          const currentScrollLeft = container.scrollLeft();

          zTreeObj.expandNode(treeNode, !isExpanded, false, false);

          if (container.length > 0) {
            container.scrollLeft(currentScrollLeft);

            requestAnimationFrame(() => {
              container.scrollLeft(currentScrollLeft);
              requestAnimationFrame(() => {
                container.scrollLeft(currentScrollLeft);
                requestAnimationFrame(() => {
                  container.scrollLeft(currentScrollLeft);
                });
              });
            });
          }

          zTreeObj.selectNode(treeNode, true, false);
          currentSelectedNandoId = treeNode.nando_id;

          if (container.length > 0) {
            container.scrollLeft(currentScrollLeft);

            requestAnimationFrame(() => {
              container.scrollLeft(currentScrollLeft);
              requestAnimationFrame(() => {
                container.scrollLeft(currentScrollLeft);
                requestAnimationFrame(() => {
                  container.scrollLeft(currentScrollLeft);
                });
              });
            });
          }

          if (!SKIP_LIST.includes(treeNode.nando_id)) {
            _onClick_handler(treeNode.nando_id);
          }
          return;
        }
        if (!SKIP_LIST.includes(treeNode.nando_id)) {
          currentSelectedNandoId = treeNode.nando_id;

          const selectScrollLeft = container.scrollLeft();

          zTreeObj.selectNode(treeNode, true, false);

          if (container.length > 0) {
            container.scrollLeft(selectScrollLeft);

            requestAnimationFrame(() => {
              container.scrollLeft(selectScrollLeft);
              requestAnimationFrame(() => {
                container.scrollLeft(selectScrollLeft);
                requestAnimationFrame(() => {
                  container.scrollLeft(selectScrollLeft);
                });
              });
            });
          }

          _onClick_handler(treeNode.nando_id);
        }
      },
      beforeExpand: function (treeId, treeNode) {
        const container = $('.treeview-container');
        if (container.length > 0) {
          savedScrollLeft = container.scrollLeft();
        }

        if (treeNode.isFirstTimeLoad) {
          zTreeObj.removeChildNodes(treeNode);
          treeNode.isParent = true;
          zTreeObj.reAsyncChildNodes(treeNode, 'refresh');
        }
        return true;
      },
      onExpand: function (treeId, treeNode) {
        manuallyCollapsedNodes.delete(treeNode.tId);

        treeNode.isFirstTimeLoad = false;
        const container = $('.treeview-container');
        if (container.length > 0) {
          container.scrollLeft(savedScrollLeft);
          requestAnimationFrame(() => {
            container.scrollLeft(savedScrollLeft);
            requestAnimationFrame(() => {
              container.scrollLeft(savedScrollLeft);
              requestAnimationFrame(() => {
                container.scrollLeft(savedScrollLeft);
              });
            });
          });
        }

        setTimeout(function () {
          _applyHighlightFromUrl();

          const button = $('#' + treeNode.tId + '_switch');
          if (button.length) {
            button.removeClass(
              'close close_docu close_ico_docu close_ico_close close_ico_open close_ico'
            );
            button.addClass(
              'open open_docu open_ico_docu open_ico_open open_ico_close open_ico'
            );
            button.css('content', '"▼"');
            button.attr('data-icon', 'open');
          }
          adjustSidebarToContent();
        }, 0);
      },
      onCollapse: function (treeId, treeNode) {
        manuallyCollapsedNodes.add(treeNode.tId);

        const container = $('.treeview-container');
        if (container.length > 0) {
          savedScrollLeft = container.scrollLeft();
        }

        setTimeout(function () {
          if (container.length > 0) {
            container.scrollLeft(savedScrollLeft);

            requestAnimationFrame(() => {
              container.scrollLeft(savedScrollLeft);
              requestAnimationFrame(() => {
                container.scrollLeft(savedScrollLeft);
                requestAnimationFrame(() => {
                  container.scrollLeft(savedScrollLeft);
                });
              });
            });
          }

          const currentNandoId = _getCurrentNandoIdFromUrl();
          if (currentNandoId) {
            const targetNode = zTreeObj.getNodesByParam(
              'nando_id',
              currentNandoId,
              null
            )[0];
            if (targetNode) {
              let parentNode = targetNode.getParentNode();
              let isParentOfSelected = false;
              while (parentNode) {
                if (parentNode.tId === treeNode.tId) {
                  isParentOfSelected = true;
                  break;
                }
                parentNode = parentNode.getParentNode();
              }
              if (!isParentOfSelected) {
                _applyHighlightFromUrl();
              }
            } else {
              _applyHighlightFromUrl();
            }
          } else {
            _applyHighlightFromUrl();
          }
        }, 0);
        setTimeout(function () {
          const button = $('#' + treeNode.tId + '_switch');
          if (button.length) {
            button.removeClass(
              'open open_docu open_ico_docu open_ico_open open_ico_close open_ico'
            );
            button.addClass(
              'close close_docu close_ico_docu close_ico_close close_ico_open close_ico'
            );
            button.css('content', '"▶"');
            button.attr('data-icon', 'close');
          }
        }, 50);
      },
    },
    data: {
      key: {
        name: 'displayName',
        title: 'nando_id',
      },
      simpleData: {
        enable: false,
      },
    },
  };

  zTreeObj = $.fn.zTree.init($('#treeview'), setting, treeview_data);

  const nodes = zTreeObj.getNodes();
  _highlight_upstream_treeview_startNode(zTreeObj, nodes, startId);

  setTimeout(() => {
    if (!isExpandingParentNodes) {
      _expandParentNodesForSelectedNode(zTreeObj, startId);
      _applyHighlightFromUrl();
    }
  }, 200);

  setTimeout(() => {
    if (!isExpandingParentNodes) {
      _expandParentNodesForSelectedNode(zTreeObj, startId);
      _applyHighlightFromUrl();
    }
  }, 500);

  setTimeout(() => {
    _applyHighlightFromUrl();
  }, 100);

  setTimeout(() => {
    _applyHighlightFromUrl();
  }, 300);

  let highlightTimer = null;
  let lastScrollLeft = 0;
  let lastScrollTop = 0;

  const observer = new MutationObserver(function (mutations) {
    const container = $('.treeview-container');
    if (container.length > 0) {
      lastScrollLeft = container.scrollLeft();
      lastScrollTop = container.scrollTop();
    }

    let needReapply = false;
    mutations.forEach(function (mutation) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        const target = mutation.target;
        if (target.tagName === 'A' && target.getAttribute('title')) {
          const titleId = target.getAttribute('title');
          const currentNandoId = _getCurrentNandoIdFromUrl();
          if (
            titleId === currentNandoId &&
            !target.classList.contains('curSelectedNode')
          ) {
            needReapply = true;
          }
        }
      }
      if (mutation.type === 'childList') {
        needReapply = true;
      }
    });
    if (needReapply) {
      if (highlightTimer) {
        clearTimeout(highlightTimer);
      }
      highlightTimer = setTimeout(() => {
        if (container.length > 0) {
          container.scrollLeft(lastScrollLeft);
          container.scrollTop(lastScrollTop);
        }
        _applyHighlightFromUrl();
      }, 100);
    }
  });

  const treeviewContainer = document.querySelector('.treeview-container');
  if (treeviewContainer) {
    observer.observe(treeviewContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  $('#treeview').on('click', 'span.button', function (e) {
    e.stopPropagation();

    const treeId = $(this).closest('ul').attr('id');
    const treeNodeId = $(this).attr('id').replace('_switch', '');
    const treeNode = zTreeObj.getNodeByTId(treeNodeId);

    if (treeNode && treeNode.isParent) {
      const container = $('.treeview-container');
      const currentScrollLeft =
        container.length > 0 ? container.scrollLeft() : 0;

      if (treeNode.isFirstTimeLoad) {
        zTreeObj.reAsyncChildNodes(treeNode, 'refresh');
        treeNode.isFirstTimeLoad = false;
      }

      const isExpanded = treeNode.open;
      zTreeObj.expandNode(treeNode, !isExpanded, false, false);

      if (container.length > 0) {
        container.scrollLeft(currentScrollLeft);
        requestAnimationFrame(() => {
          container.scrollLeft(currentScrollLeft);
          requestAnimationFrame(() => {
            container.scrollLeft(currentScrollLeft);
            requestAnimationFrame(() => {
              container.scrollLeft(currentScrollLeft);
            });
          });
        });
      }
    }
  });
}

// -------------------------------
function adjustSidebarToContent() {
  const sidebar = $('#sidebar');

  if (sidebar.length === 0) return;
  if (sidebar.hasClass('collapsed')) return;

  if (window.sidebarManuallyResized) return;

  window.sidebarManuallyResized = true;
}

// -------------------------------
// 起動処理
// -------------------------------
$(document).ready(function () {
  const urlObj = new URL(window.location.href);
  const q = urlObj.searchParams;

  const urlLang = q.get('lang');
  if (urlLang === 'ja' || urlLang === 'en') {
    lang = urlLang;
  } else {
    const languageSelect = document.querySelector('.language-select');
    if (languageSelect && languageSelect.value) {
      lang =
        languageSelect.value === 'ja' || languageSelect.value === 'en'
          ? languageSelect.value
          : lang;
    } else {
      const htmlLang = document.documentElement.lang;
      if (htmlLang === 'ja' || htmlLang === 'ja_JP') {
        lang = 'ja';
      } else if (htmlLang === 'en') {
        lang = 'en';
      }
    }
  }

  const qNando = q.get('nando_id');
  if (qNando) {
    nando_id = qNando;
  } else {
    const path = urlObj.pathname;
    const idx = path.indexOf('NANDO:');
    if (idx !== -1) {
      nando_id = decodeURIComponent(path.slice(idx));
    }
  }

  if (lang !== 'ja') lang = 'en';

  const url_str = `${URL_GET_PANEL_UPSTREAM_HIERARCHY}?nando_id=${encodeURIComponent(
    nando_id
  )}&lang=${encodeURIComponent(lang)}`;

  $.ajax({ url: url_str, type: 'GET', async: true, dataType: 'text' })
    .done(function (data) {
      try {
        const json_data = JSON.parse(data);
        init_ui_upstream_trace(nando_id, json_data, lang);
      } catch (e) {
        console.error('JSON parse error', e, data);
        alert('サーバー応答の形式が不正です。');
      }
    })
    .fail(function () {
      console.log('AJAXに失敗しました。\nURL: ' + url_str);
    });
});
