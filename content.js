let lastQuery = '';
let lastExcludeQuery = [];

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function observeListChanges(listContainer) {
  const observer = new MutationObserver(() => {
    filterPlaces(lastQuery, lastExcludeQuery);
  });
  observer.observe(listContainer, { childList: true, subtree: true });
}

function injectFilterUI() {
  if (document.getElementById('maps-list-filter')) return;

  const container = document.createElement('div');
  container.id = 'maps-list-filter';
  container.innerHTML = `
    <input type="text" id="maps-filter-input" placeholder="Filter places by name, type, price, or notes..." />
    <div class="filter-examples">
      Hint: use -word to exclude
    </div>
    <div class="filter-examples">
      Examples: "restaurant -expensive", "mala -✅"
    </div>
  `;
  document.body.appendChild(container);

  document.getElementById('maps-filter-input').addEventListener('input', (e) => {
    const input = e.target.value;
    const { includeTerms, excludeTerms } = parseSearchInput(input);
    lastQuery = includeTerms.join(' ').toLowerCase();
    lastExcludeQuery = excludeTerms.map(term => term.toLowerCase());
    filterPlaces(lastQuery, lastExcludeQuery);
  });
}

function parseSearchInput(input) {
  const terms = input.trim().split(/\s+/);
  const includeTerms = [];
  const excludeTerms = [];
  
  terms.forEach(term => {
    if (term.startsWith('-') && term.length > 1) {
      excludeTerms.push(term.substring(1));
    } else if (term.length > 0 && term !== '-') {
      includeTerms.push(term);
    }
  });
  
  return { includeTerms, excludeTerms };
}

function filterPlaces(query, excludeQuery = []) {
  const listContainer = document.querySelector('div[role="main"]');
  if (!listContainer) return;

  const allButtons = Array.from(listContainer.querySelectorAll('button'));
  const placeButtons = allButtons.filter(button => {
    const hasImage = button.querySelector('img');
    const hasHeadline = button.querySelector('h1, h2, h3, h4, .fontHeadlineSmall');
    const hasMultipleDivsOrSpans = button.querySelectorAll('div, span').length > 2;
    return (hasImage && hasHeadline) || (hasHeadline && hasMultipleDivsOrSpans) || (hasImage && hasMultipleDivsOrSpans);
  });

  const itemsToShowOrHide = [];
  placeButtons.forEach(button => {
    // Find the closest div ancestor that is NOT the listContainer itself
    let itemDiv = button.closest('div');
    while (itemDiv && (itemDiv === listContainer || !itemDiv.contains(button))) {
      itemDiv = itemDiv.parentElement.closest('div');
    }
    // If we somehow end up at the listContainer, skip
    if (!itemDiv || itemDiv === listContainer) return;

    let name = '';
    let typePrice = '';
    let note = '';
    const nameElement = button.querySelector('h1, h2, h3, h4, .fontHeadlineSmall');

    if (nameElement && nameElement.textContent.trim()) {
      name = nameElement.textContent.trim().toLowerCase();
      let allButtonText = button.textContent.trim().toLowerCase();
      let normalizedName = name.replace(/\s+/g, ' ');
      let normalizedAllButtonText = allButtonText.replace(/\s+/g, ' ');
      if (normalizedAllButtonText.includes(normalizedName)) {
        typePrice = normalizedAllButtonText.replace(normalizedName, '').trim();
      } else {
        typePrice = normalizedAllButtonText;
      }
    } else {
      typePrice = button.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // Extract note: 
    const itemDivNextSibling = itemDiv.nextElementSibling;

    // Path 1: Check if the direct next sibling of itemDiv seems to be a note container (matches E2E fixture structure for item1, item4 notes).
    if (itemDivNextSibling && itemDivNextSibling.matches('div.item-note, span.item-note, div[class*="note"], span[class*="note"]')) {
        note = itemDivNextSibling.textContent.trim().toLowerCase();
    }

    // Path 2: If note not found as a direct sibling, or to ensure we capture textarea notes correctly (e.g., from real Google Maps HTML).
    if (note === '') { 
        // Look for textarea with stable attributes (aria-label, placeholder, or data attributes)
        const noteTextarea = itemDiv.querySelector(
          'textarea[aria-label*="ote"], textarea[aria-label*="Note"], ' +
          'textarea[placeholder*="ote"], textarea[placeholder*="Note"], ' +
          'textarea[data-value], textarea[role="textbox"]'
        );
        if (noteTextarea && typeof noteTextarea.value === 'string') {
            note = noteTextarea.value.trim().toLowerCase();
        } else {
            // Fallback: Look for note containers using more stable selectors
            // Target elements that contain textareas or have note-like content
            const inlineNoteElement = itemDiv.querySelector(
              'div[class*="note"], span[class*="note"], ' +
              'div:has(textarea), span:has(textarea), ' +
              '[aria-label*="ote"], [data-value], ' +
              'div[contenteditable="true"], span[contenteditable="true"]'
            );
            if (inlineNoteElement) {
                // If this element wraps a textarea, prioritize textarea's value.
                const innerTextarea = inlineNoteElement.querySelector(
                  'textarea[aria-label*="ote"], textarea[placeholder*="ote"], ' +
                  'textarea[data-value], textarea[role="textbox"]'
                );
                if (innerTextarea && typeof innerTextarea.value === 'string') {
                    note = innerTextarea.value.trim().toLowerCase();
                } else {
                    // Otherwise, take the textContent of the found inlineNoteElement itself.
                    note = inlineNoteElement.textContent.trim().toLowerCase();
                }
            }
        }
    }

    if ((!name || name.length < 3) && typePrice.length > 0) {
      const parts = typePrice.split(/\s*·\s*|\s{2,}/);
      for (const part of parts) {
        const potentialName = part.trim();
        if (potentialName.length > 2 && /[a-zA-Z]/.test(potentialName) && !/^\$?\d/.test(potentialName) && !/^\d+(\.\d+)?\s*\$/.test(potentialName)) {
          name = potentialName;
          let normalizedTypePrice = typePrice.replace(/\s+/g, ' ');
          let normalizedNewName = name.replace(/\s+/g, ' ');
          if (normalizedTypePrice.includes(normalizedNewName)) {
              typePrice = normalizedTypePrice.replace(normalizedNewName, '').trim();
          }
          break; 
        }
      }
      if ((!name || name.length < 3) && parts.length > 0 && parts[0].trim().length > 2 && /[a-zA-Z]/.test(parts[0].trim())){
          name = parts[0].trim();
          let normalizedTypePrice = typePrice.replace(/\s+/g, ' ');
          let normalizedNewName = name.replace(/\s+/g, ' ');
          if (normalizedTypePrice.includes(normalizedNewName)) {
              typePrice = normalizedTypePrice.replace(normalizedNewName, '').trim();
          }
      }
    }
    typePrice = typePrice.replace(/^[^a-zA-Z0-9$]+/, '').trim();
    itemsToShowOrHide.push({ element: itemDiv, name, typePrice, note });
  });

  // First, make all identified items visible by default
  itemsToShowOrHide.forEach(itemData => {
    itemData.element.style.display = ''; 
  });
  
  // console.log(itemsToShowOrHide); // This shows the correct data

  // Then, apply include and exclude filters
  itemsToShowOrHide.forEach(itemData => {
    const normalizedName = removeDiacritics(itemData.name);
    const normalizedTypePrice = removeDiacritics(itemData.typePrice);
    const normalizedNote = removeDiacritics(itemData.note);
    
    let shouldShow = true;
    
    // Apply include filter (if there's a query)
    if (query && query.length > 0) {
      const normalizedQuery = removeDiacritics(query);
      const isMatchByName = normalizedName.includes(normalizedQuery);
      const isMatchByTypePrice = normalizedTypePrice.includes(normalizedQuery);
      const isMatchByNote = normalizedNote.includes(normalizedQuery);
      const queryFound = isMatchByName || isMatchByTypePrice || isMatchByNote;
      
      if (!queryFound) {
        shouldShow = false;
      }
    }
    
    // Apply exclude filter (if there are exclude terms)
    if (excludeQuery && excludeQuery.length > 0 && shouldShow) {
      const shouldExclude = excludeQuery.some(excludeTerm => {
        const normalizedExcludeTerm = removeDiacritics(excludeTerm);
        const isExcludeMatchByName = normalizedName.includes(normalizedExcludeTerm);
        const isExcludeMatchByTypePrice = normalizedTypePrice.includes(normalizedExcludeTerm);
        const isExcludeMatchByNote = normalizedNote.includes(normalizedExcludeTerm);
        return isExcludeMatchByName || isExcludeMatchByTypePrice || isExcludeMatchByNote;
      });
      
      if (shouldExclude) {
        shouldShow = false;
      }
    }
    
    itemData.element.style.display = shouldShow ? '' : 'none';
  });
}

function getScrollableListContainer() {
  const listContainer = document.querySelector('div[role="main"]');
  if (!listContainer) return null;
  // Find the first scrollable child (heuristic: has scrollHeight > clientHeight)
  for (const child of listContainer.querySelectorAll('div')) {
    if (child.scrollHeight > child.clientHeight + 20) {
      return child;
    }
  }
  // Fallback: if no child is scrollable, maybe the listContainer itself is
  if (listContainer.scrollHeight > listContainer.clientHeight + 20) {
    return listContainer;
  }
  return null;
}

function autoScrollListToLoadAll(callback, maxTries = 20) {
  let tries = 0;
  function tryScroll() {
    const scrollable = getScrollableListContainer();
    if (!scrollable) {
      if (tries++ < maxTries) {
        setTimeout(tryScroll, 300);
      }
      return;
    }
    let lastScrollHeight = 0;
    let sameCount = 0;
    function scrollStep() {
      scrollable.scrollTop = scrollable.scrollHeight;
      setTimeout(() => {
        if (scrollable.scrollHeight !== lastScrollHeight) {
          lastScrollHeight = scrollable.scrollHeight;
          sameCount = 0;
          scrollStep();
        } else if (sameCount < 3) {
          sameCount++;
          scrollStep();
        } else {
          if (callback) callback();
        }
      }, 500);
    }
    scrollStep();
  }
  tryScroll();
}

function waitForListToLoad() {
  const interval = setInterval(() => {
    const listContainer = document.querySelector('div[role="main"]');
    if (listContainer) {
      clearInterval(interval);
      injectFilterUI();
      observeListChanges(listContainer);
      autoScrollListToLoadAll(() => {
        filterPlaces(lastQuery, lastExcludeQuery);
      });
    }
  }, 1000);
}

// Only run waitForListToLoad if not in a test environment
if (typeof __TEST_ENV__ === 'undefined') {
  waitForListToLoad();
}