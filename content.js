let lastQuery = '';

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function observeListChanges(listContainer) {
  const observer = new MutationObserver(() => {
    filterPlaces(lastQuery);
  });
  observer.observe(listContainer, { childList: true, subtree: true });
}

function injectFilterUI() {
  if (document.getElementById('maps-list-filter')) return;

  const container = document.createElement('div');
  container.id = 'maps-list-filter';
  container.innerHTML = `
    <input type="text" id="maps-filter-input" placeholder="Filter places..." />
  `;
  document.body.appendChild(container);

  document.getElementById('maps-filter-input').addEventListener('input', (e) => {
    lastQuery = e.target.value.toLowerCase();
    filterPlaces(lastQuery);
  });
}

function filterPlaces(query) {
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

    // Extract note: look for a textarea or a div/span with user note text near the button
    // Heuristic: look for a sibling or next element with a textarea or a div with a lot of text
    let noteElement = null;
    // Try next sibling
    let next = itemDiv.nextElementSibling;
    if (next) {
      noteElement = next.querySelector('textarea, div, span');
    }
    // Or look for a textarea or div with a lot of text inside itemDiv (for inline notes)
    if (!noteElement) {
      noteElement = itemDiv.querySelector('textarea, div, span');
    }
    if (noteElement && noteElement.textContent && noteElement.textContent.trim().length > 0) {
      note = noteElement.textContent.trim().toLowerCase();
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
  
  console.log(itemsToShowOrHide); // This shows the correct data

  // Then, hide items that don't match (if there's a query)
  if (query && query.length > 0) {
    console.log(`Filtering for query: "${query}"`); // Log the active query
    const normalizedQuery = removeDiacritics(query);
    itemsToShowOrHide.forEach(itemData => {
      const normalizedName = removeDiacritics(itemData.name);
      const normalizedTypePrice = removeDiacritics(itemData.typePrice);
      const normalizedNote = removeDiacritics(itemData.note);
      const isMatchByName = normalizedName.includes(normalizedQuery);
      const isMatchByTypePrice = normalizedTypePrice.includes(normalizedQuery);
      const isMatchByNote = normalizedNote.includes(normalizedQuery);
      const queryFound = isMatchByName || isMatchByTypePrice || isMatchByNote;

      if (!queryFound) {
        itemData.element.style.display = 'none';
      } else {
        itemData.element.style.display = ''; // Explicitly ensure it's shown if matched
      }
    });
  }
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
        filterPlaces(lastQuery);
      });
    }
  }, 1000);
}

waitForListToLoad();