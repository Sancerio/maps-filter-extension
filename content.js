let lastQuery = '';
let lastExcludeQuery = [];

// Track fully loaded lists by their identifier
let fullyLoadedLists = new Set();

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Recursively collect all text content from an element
function extractAllText(element) {
  if (!element) return '';
  let text = '';
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    null,
    false
  );
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      text += ' ' + node.textContent.trim();
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      const alt = el.getAttribute && el.getAttribute('alt');
      const aria = el.getAttribute && el.getAttribute('aria-label');
      const title = el.getAttribute && el.getAttribute('title');
      const placeholder = el.getAttribute && el.getAttribute('placeholder');
      if (alt) text += ' ' + alt.trim();
      if (aria) text += ' ' + aria.trim();
      if (title) text += ' ' + title.trim();
      if (placeholder) text += ' ' + placeholder.trim();

      // Include textarea value because user text may not appear as a text node
      if (el.tagName === 'TEXTAREA' && typeof el.value === 'string') {
        text += ' ' + el.value.trim();
      }
    }
  }
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function observeListChanges(listContainer) {
  let lastListIdentifier = getListIdentifier(listContainer);
  let debounceTimer = null;
  
  const observer = new MutationObserver((mutations) => {
    // Check for filtering changes (existing functionality)
    filterPlaces(lastQuery, lastExcludeQuery);
    
    // Check if this might be a list navigation (major content change)
    const hasSignificantChanges = mutations.some(mutation => {
      // Look for major structural changes that indicate list navigation
      return mutation.type === 'childList' && 
             (mutation.addedNodes.length > 5 || mutation.removedNodes.length > 5);
    });
    
    if (hasSignificantChanges) {
      // Debounce to avoid excessive triggers during rapid changes
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const currentListIdentifier = getListIdentifier(listContainer);
        
        // If the list content has significantly changed, re-run auto-scroll
        if (currentListIdentifier !== lastListIdentifier) {
          console.log('List navigation detected, re-loading places...');
          lastListIdentifier = currentListIdentifier;
          
          // Re-run auto-scroll for the new list
          autoScrollListToLoadAll(() => {
            filterPlaces(lastQuery, lastExcludeQuery);
          }, 20, true); // isReload = true
        }
      }, 1000); // Wait 1 second after changes stop
    }
  });
  
  observer.observe(listContainer, { 
    childList: true, 
    subtree: true,
    characterData: true // Also watch for text changes
  });
}

// Helper function to identify the current list based on its content
function getListIdentifier(listContainer) {
  if (!listContainer) return '';
  
  // Create an identifier based on the first few place names and total count
  const buttons = listContainer.querySelectorAll('button');
  const placeButtons = Array.from(buttons).filter(button => {
    const hasImage = button.querySelector('img');
    const hasHeadline = button.querySelector('h1, h2, h3, h4, .fontHeadlineSmall');
    const hasMultipleDivsOrSpans = button.querySelectorAll('div, span').length > 2;
    return (hasImage && hasHeadline) || (hasHeadline && hasMultipleDivsOrSpans) || (hasImage && hasMultipleDivsOrSpans);
  });
  
  // Use first 3 place names + total count as identifier
  const firstThreeNames = placeButtons.slice(0, 3).map(button => {
    const nameElement = button.querySelector('h1, h2, h3, h4, .fontHeadlineSmall');
    return nameElement ? nameElement.textContent.trim() : '';
  }).join('|');
  
  return `${firstThreeNames}:${placeButtons.length}`;
}

function injectFilterUI() {
  if (document.getElementById('maps-list-filter')) return;

  const container = document.createElement('div');
  container.id = 'maps-list-filter';
  container.innerHTML = `
    <div class="filter-content">
      <div class="input-wrapper" style="position:relative;">
        <input type="text" id="maps-filter-input" placeholder="Filter places by name, type, price, or notes..." />
        <button id="collapse-filter" class="collapse-button" aria-label="Hide filter">
          <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true">
          <path d="M2.1 12c2.3-4.3 6.2-7 9.9-7s7.6 2.7 9.9 7c-2.3 4.3-6.2 7-9.9 7S4.4 16.3 2.1 12z"/>
          <circle cx="12" cy="12" r="3.5"/>
          <line x1="3" y1="3" x2="21" y2="21"/>

        </svg>

        </button>
      </div>
      <div class="filter-examples">
        Hint: use -word to exclude
      </div>
      <div class="filter-examples">
        Examples: "restaurant -expensive", "mala -✅"
      </div>
      <div id="loading-indicator" class="loading-state" style="display: none;">
        <div class="loading-spinner"></div>
        <span>Loading all places...</span>
      </div>
    </div>
    <div id="maps-filter-toggle" aria-label="Show filter">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="#5f6368" aria-hidden="true">
        <path d="M1.5 1.5h13l-4 4v6l-5 2v-8l-4-4z"/>
      </svg>
    </div>
  `;
  document.body.appendChild(container);

  // Restore last state from chrome.storage.local
  chrome.storage && chrome.storage.local.get([
    'mapsFilterCollapsed',
    'mapsFilterPosition'
  ], (result) => {
    if (result.mapsFilterCollapsed === true) {
      container.classList.add('collapsed');
    }
    if (result.mapsFilterPosition) {
      const { left, top } = result.mapsFilterPosition;
      if (typeof left === 'number') {
        container.style.left = `${left}px`;
        container.style.right = 'auto';
      }
      if (typeof top === 'number') {
        container.style.top = `${top}px`;
      }
    }
  });

  // Set the extension icon for the toggle button
  const toggleButton = document.getElementById('maps-filter-toggle');
  if (chrome.runtime && chrome.runtime.getURL) {
    const iconUrl = chrome.runtime.getURL('icons/icon_48x48.png');
    console.log('Attempting to load extension icon from:', iconUrl);
    
    // Create an image to test if the icon loads properly
    const testImage = new Image();
    testImage.onload = function() {
      // Icon loaded successfully, set it as background and remove SVG
      console.log('Extension icon loaded successfully');
      toggleButton.style.backgroundImage = `url(${iconUrl})`;
      toggleButton.style.backgroundSize = '20px 20px';
      toggleButton.style.backgroundPosition = 'center';
      toggleButton.style.backgroundRepeat = 'no-repeat';
      const svgIcon = toggleButton.querySelector('svg');
      if (svgIcon) {
        svgIcon.remove();
      }
    };
    testImage.onerror = function() {
      // Icon failed to load, keep the SVG fallback
      console.log('Extension icon failed to load, using SVG fallback');
    };
    testImage.src = iconUrl;
  } else {
    console.log('Chrome runtime not available, using SVG fallback');
  }

  document.getElementById('maps-filter-input').addEventListener('input', (e) => {
    const input = e.target.value;
    const { includeTerms, excludeTerms } = parseSearchInput(input);
    lastQuery = includeTerms.join(' ').toLowerCase();
    lastExcludeQuery = excludeTerms.map(term => term.toLowerCase());
    filterPlaces(lastQuery, lastExcludeQuery);
  });

  document.getElementById('collapse-filter').addEventListener('click', collapseFilterUI);
  document.getElementById('maps-filter-toggle').addEventListener('click', expandFilterUI);

  // Enable dragging of the container so it can be moved around
  makeDraggable(container);
}

function collapseFilterUI() {
  const container = document.getElementById('maps-list-filter');
  if (container) {
    container.classList.add('collapsed');
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ mapsFilterCollapsed: true });
    }
  }
}

function expandFilterUI() {
  const container = document.getElementById('maps-list-filter');
  if (container) {
    container.classList.remove('collapsed');
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ mapsFilterCollapsed: false });
    }
  }
}

// Make an element draggable so users can reposition the filter UI
function makeDraggable(el) {
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let moved = false;

  const startDrag = (e) => {
    // Don't start drag when interacting with inputs or non-toggle buttons
    if (
      e.target.closest('input') ||
      (e.target.closest('button') && !e.target.closest('#maps-filter-toggle')) ||
      e.target.closest('textarea')
    ) {
      return;
    }

    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    dragging = true;
    moved = false;

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', endDrag);
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!dragging) return;
    const newLeft = e.clientX - offsetX;
    const newTop = e.clientY - offsetY;
    if (Math.abs(newLeft - parseInt(el.style.left || 0, 10)) > 2 ||
        Math.abs(newTop - parseInt(el.style.top || 0, 10)) > 2) {
      moved = true;
    }
    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
    el.style.right = 'auto';
    e.preventDefault();
  };

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', endDrag);
    if (chrome.storage && chrome.storage.local) {
      const left = parseInt(el.style.left, 10);
      const top = parseInt(el.style.top, 10);
      chrome.storage.local.set({ mapsFilterPosition: { left, top } });
    }
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  el.addEventListener('pointerdown', startDrag);
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
    if (!itemDiv || itemDiv === listContainer) return;

    let itemText = extractAllText(itemDiv);
    const sibling = itemDiv.nextElementSibling;
    if (
      sibling && (
        sibling.matches('div.item-note, span.item-note, div[class*="note"], span[class*="note"]') ||
        sibling.querySelector('textarea')
      )
    ) {
      itemText += ' ' + extractAllText(sibling);
    }

    itemsToShowOrHide.push({ element: itemDiv, text: itemText });
  });

  // First, make all identified items visible by default
  itemsToShowOrHide.forEach(itemData => {
    itemData.element.style.display = ''; 
  });
  
  // console.log(itemsToShowOrHide); // This shows the correct data

  // Then, apply include and exclude filters
  itemsToShowOrHide.forEach(itemData => {
    const normalizedText = removeDiacritics(itemData.text);

    let shouldShow = true;

    // Apply include filter (if there's a query)
    if (query && query.length > 0) {
      const normalizedQuery = removeDiacritics(query);
      if (!normalizedText.includes(normalizedQuery)) {
        shouldShow = false;
      }
    }

    // Apply exclude filter (if there are exclude terms)
    if (excludeQuery && excludeQuery.length > 0 && shouldShow) {
      const shouldExclude = excludeQuery.some(excludeTerm => {
        const normalizedExcludeTerm = removeDiacritics(excludeTerm);
        return normalizedText.includes(normalizedExcludeTerm);
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

function autoScrollListToLoadAll(callback, maxTries = 20, isReload = false) {
  // Show loading with appropriate message
  if (isReload) {
    showLoadingState('Loading new list...');
  } else {
    showLoadingState();
  }
  
  let tries = 0;
  function tryScroll() {
    const scrollable = getScrollableListContainer();
    if (!scrollable) {
      if (tries++ < maxTries) {
        setTimeout(tryScroll, 300);
      } else {
        hideLoadingState(); // Hide loading if we can't find scrollable container
      }
      return;
    }
    let lastScrollHeight = 0;
    let sameCount = 0;
    function scrollStep() {
      scrollable.scrollTop = scrollable.scrollHeight;
      
      // Update progress indicator
      updateLoadingProgress();
      
      setTimeout(() => {
        if (scrollable.scrollHeight !== lastScrollHeight) {
          lastScrollHeight = scrollable.scrollHeight;
          sameCount = 0;
          scrollStep();
        } else if (sameCount < 3) {
          sameCount++;
          scrollStep();
        } else {
          // Mark this list as fully loaded
          markListAsFullyLoaded();
          
          // Show success message briefly before hiding
          showSuccessMessage(isReload);
          setTimeout(() => {
            hideLoadingState(); // Hide loading when scrolling is complete
            if (callback) callback();
          }, 1000);
        }
      }, 500);
    }
    scrollStep();
  }
  tryScroll();
}

function updateLoadingProgress() {
  const listContainer = document.querySelector('div[role="main"]');
  const loadingIndicator = document.getElementById('loading-indicator');
  
  if (listContainer && loadingIndicator) {
    const allButtons = Array.from(listContainer.querySelectorAll('button'));
    const placeButtons = allButtons.filter(button => {
      const hasImage = button.querySelector('img');
      const hasHeadline = button.querySelector('h1, h2, h3, h4, .fontHeadlineSmall');
      const hasMultipleDivsOrSpans = button.querySelectorAll('div, span').length > 2;
      return (hasImage && hasHeadline) || (hasHeadline && hasMultipleDivsOrSpans) || (hasImage && hasMultipleDivsOrSpans);
    });
    
    const loadingText = loadingIndicator.querySelector('span');
    if (loadingText) {
      loadingText.textContent = `Loading places... (${placeButtons.length} found)`;
    }
  }
}

function waitForListToLoad() {
  let currentUrl = window.location.href;
  
  const interval = setInterval(() => {
    const listContainer = document.querySelector('div[role="main"]');
    
    // Check if URL has changed (indicates navigation)
    const newUrl = window.location.href;
    const urlChanged = newUrl !== currentUrl;
    currentUrl = newUrl;
    
    if (listContainer) {
      clearInterval(interval);
      injectFilterUI();
      observeListChanges(listContainer);
      
      // Only start auto-scroll if we're not on the lists overview page
      if (!isListOverviewPage() && hasPlaceContent(listContainer)) {
        autoScrollListToLoadAll(() => {
          filterPlaces(lastQuery, lastExcludeQuery);
        });
      }
      
      // Also monitor for URL changes (list navigation)
      monitorUrlChanges();
    }
  }, 1000);
}

// Helper function to check if the list is already fully loaded
function isListFullyLoaded() {
  const listContainer = document.querySelector('div[role="main"]');
  if (!listContainer) return false;
  
  // Get current list identifier
  const listId = getListIdentifier(listContainer);
  
  // Check if we've already marked this list as fully loaded
  if (fullyLoadedLists.has(listId)) {
    console.log('List already marked as fully loaded:', listId);
    return true;
  }
  
  // Check if Google Maps is still showing loading indicators
  const hasLoadingSpinner = document.querySelector('.loading, [data-value="Loading"], .spinner');
  if (hasLoadingSpinner) {
    return false;
  }
  
  // Check if the scrollable container can be scrolled more
  const scrollable = getScrollableListContainer();
  if (!scrollable) return false;
  
  // If we can't scroll down more, the list is likely fully loaded
  const canScrollMore = scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 10;
  
  return !canScrollMore;
}

// Helper function to mark a list as fully loaded
function markListAsFullyLoaded() {
  const listContainer = document.querySelector('div[role="main"]');
  if (listContainer) {
    const listId = getListIdentifier(listContainer);
    fullyLoadedLists.add(listId);
    console.log('Marked list as fully loaded:', listId);
  }
}

function monitorUrlChanges() {
  let lastUrl = window.location.href;
  let urlCheckInterval;
  
  // Monitor URL changes
  urlCheckInterval = setInterval(() => {
    const currentUrl = window.location.href;
    
    if (currentUrl !== lastUrl) {
      console.log('URL changed, checking for list navigation...');
      lastUrl = currentUrl;
      
      // Clear the fully loaded cache when navigating to a potentially different list
      // We'll re-evaluate if the new list is loaded
      const currentListContainer = document.querySelector('div[role="main"]');
      if (currentListContainer) {
        const currentListId = getListIdentifier(currentListContainer);
        // Only clear if we're navigating to a different list
        if (!fullyLoadedLists.has(currentListId)) {
          fullyLoadedLists.clear();
          console.log('Cleared fully loaded lists cache for new navigation');
        }
      }
      
      // Small delay to let the new content load
      setTimeout(() => {
        const listContainer = document.querySelector('div[role="main"]');
        
        // Only auto-scroll if we're viewing actual list contents (not overview)
        if (listContainer && !isListOverviewPage() && hasPlaceContent(listContainer)) {
          // Check if the list is already fully loaded
          if (isListFullyLoaded()) {
            console.log('List is already fully loaded, skipping auto-scroll');
            // Just apply filters without scrolling
            filterPlaces(lastQuery, lastExcludeQuery);
          } else {
            console.log('List content detected, starting auto-scroll...');
            autoScrollListToLoadAll(() => {
              filterPlaces(lastQuery, lastExcludeQuery);
            }, 20, true); // isReload = true
          }
        } else {
          console.log('Lists overview page detected, skipping auto-scroll');
        }
      }, 500);
    }
  }, 1000);
  
  // Clean up if page is unloaded
  window.addEventListener('beforeunload', () => {
    clearInterval(urlCheckInterval);
  });
}

function showLoadingState(customMessage = null) {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    const loadingText = loadingIndicator.querySelector('span');
    if (loadingText && customMessage) {
      loadingText.textContent = customMessage;
    }
    loadingIndicator.style.display = 'flex';
  }
}

function hideLoadingState() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
    
    // Reset to default state
    const loadingSpinner = loadingIndicator.querySelector('.loading-spinner');
    const loadingText = loadingIndicator.querySelector('span');
    
    if (loadingSpinner) {
      loadingSpinner.style.display = 'block'; // Show spinner for next time
    }
    if (loadingText) {
      loadingText.textContent = 'Loading all places...'; // Reset default text
    }
    
    // Remove success class
    loadingIndicator.classList.remove('success');
    loadingIndicator.style.background = ''; // Reset background
  }
}

function showSuccessMessage(isReload = false) {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    const loadingText = loadingIndicator.querySelector('span');
    
    if (loadingText) {
      loadingText.textContent = isReload ? 'New list loaded!' : 'All places loaded!';
    }
    
    // Add success class for styling
    loadingIndicator.classList.add('success');
  }
}

// Helper function to detect if we're on the lists overview page vs. inside a specific list
function isListOverviewPage() {
  // Check for list overview indicators
  const listOverviewIndicators = [
    // Text that appears on overview page
    'Lists you saved',
    'Starred places', 
    'Favorites',
    // List metadata patterns (e.g., "Private • 3 places")
    'Private •',
    '• 0 places',
    '• 1 place',
    '• 2 places',
    '• 3 places',
    '• 4 places',
    '• 5 places'
  ];
  
  // Check if page contains overview elements
  const pageText = document.body.textContent.toLowerCase();
  const hasOverviewText = listOverviewIndicators.some(indicator => 
    pageText.includes(indicator.toLowerCase())
  );
  
  // Check for list cards (elements that link to lists rather than places)
  const listCards = document.querySelectorAll('[role="main"] [role="button"], [role="main"] a');
  const hasListCards = Array.from(listCards).some(card => {
    const cardText = card.textContent;
    return cardText.includes('places') || cardText.includes('Private •') || cardText.includes('By ');
  });
  
  // Check URL patterns that indicate overview
  const url = window.location.href;
  const urlIndicatesOverview = url.includes('/lists') && !url.includes('/list/');
  
  // We're on overview if we have overview indicators OR list cards OR URL indicates overview
  return hasOverviewText || hasListCards || urlIndicatesOverview;
}

// Helper function to detect if we have actual place content (not just list overview)
function hasPlaceContent(listContainer) {
  if (!listContainer) return false;
  
  const allButtons = Array.from(listContainer.querySelectorAll('button'));
  const placeButtons = allButtons.filter(button => {
    const hasImage = button.querySelector('img');
    const hasHeadline = button.querySelector('h1, h2, h3, h4, .fontHeadlineSmall');
    const hasMultipleDivsOrSpans = button.querySelectorAll('div, span').length > 2;
    
    // Additional check: avoid list overview cards
    const buttonText = button.textContent.toLowerCase();
    const isListCard = buttonText.includes('private •') || 
                      buttonText.includes('places') || 
                      buttonText.includes('by ') ||
                      buttonText.match(/\d+ place/);
    
    return !isListCard && ((hasImage && hasHeadline) || (hasHeadline && hasMultipleDivsOrSpans) || (hasImage && hasMultipleDivsOrSpans));
  });
  
  // We have place content if there are actual place buttons (not just list cards)
  return placeButtons.length > 0;
}

// Only run waitForListToLoad if not in a test environment
if (typeof __TEST_ENV__ === 'undefined') {
  waitForListToLoad();
}