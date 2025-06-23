const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Load the content script
const contentScriptPath = path.resolve(__dirname, '../../content.js');
const contentScript = fs.readFileSync(contentScriptPath, 'utf-8');

describe('Content Script Unit Tests', () => {
  let dom;
  let window;
  let document;
  let removeDiacritics; // To hold the function from the script
  let getScrollableListContainer; // To hold the function from the script
  let filterPlaces; 

  // Helper to create a basic list item structure
  const createPlaceItem = (id, name, typePrice, note, hasImage = true) => {
    const itemDiv = document.createElement('div');
    itemDiv.id = id;
    // This is a simplified structure. The actual script looks for the button's closest div ancestor.
    // For unit testing, we make itemDiv the direct parent that would be shown/hidden.
    
    const button = document.createElement('button');
    if (hasImage) {
      const img = document.createElement('img');
      img.src = 'fake.jpg';
      button.appendChild(img);
    }
    
    const nameEl = document.createElement('h3'); // Using h3 as an example for .fontHeadlineSmall or h1-h4
    nameEl.className = 'fontHeadlineSmall'; 
    nameEl.textContent = name;
    button.appendChild(nameEl);
    
    // Simulate typePrice by adding it to button's text content after name
    const typePriceText = document.createTextNode(` ${typePrice}`);
    button.appendChild(typePriceText);

    itemDiv.appendChild(button);

    // Simulate note element (as a sibling div for simplicity in this mock)
    if (note) {
      const noteDiv = document.createElement('div');
      noteDiv.textContent = note;
      // Assuming note element is a direct sibling for this test structure.
      // The actual logic in filterPlaces is more complex (itemDiv.nextElementSibling, etc.)
      // For more accurate note testing, we might need to refine this structure or test note extraction separately.
      itemDiv.insertAdjacentElement('afterend', noteDiv);
    }
    return itemDiv;
  };

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    // It's important to provide a basic HTML structure.
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      runScripts: 'dangerously', // Allows script execution
      url: 'http://localhost' // Important for some DOM APIs
    });
    window = dom.window;
    document = window.document;

    // Indicate a test environment to prevent auto-execution of some script parts
    window.__TEST_ENV__ = true;

    // Mock Chrome APIs
    const mockChrome = {
      storage: {
        local: {
          get: jest.fn((keys, callback) => {
            // Return empty result by default
            callback({});
          }),
          set: jest.fn((data, callback) => {
            if (callback) callback();
          })
        }
      },
      runtime: {
        getURL: jest.fn((path) => `chrome-extension://test-extension-id/${path}`),
        id: 'test-extension-id'
      }
    };
    
    // Set up chrome global
    window.chrome = mockChrome;
    global.chrome = mockChrome;

    // Execute the content script in the JSDOM context
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = contentScript;
    window.document.body.appendChild(scriptEl);

    // Assign the function from the script's global scope (within JSDOM)
    removeDiacritics = window.removeDiacritics;
    getScrollableListContainer = window.getScrollableListContainer;
    filterPlaces = window.filterPlaces; 
    // Mock the global lastQuery, as filterPlaces uses it when called from autoScrollListToLoadAll
    window.lastQuery = '';
  });

  describe('removeDiacritics', () => {
    test('should return an empty string for an empty input', () => {
      expect(removeDiacritics('')).toBe('');
    });

    test('should return the same string if no diacritics are present', () => {
      expect(removeDiacritics('hello world')).toBe('hello world');
    });

    test('should remove acute accents', () => {
      expect(removeDiacritics('áéíóú')).toBe('aeiou');
    });

    test('should remove grave accents', () => {
      expect(removeDiacritics('àèìòù')).toBe('aeiou');
    });

    test('should remove circumflex accents', () => {
      expect(removeDiacritics('âêîôû')).toBe('aeiou');
    });

    test('should remove tilde accents', () => {
      expect(removeDiacritics('ãñõ')).toBe('ano');
    });

    test('should remove umlaut accents', () => {
      expect(removeDiacritics('äëïöü')).toBe('aeiou');
    });

    test('should handle mixed case strings with diacritics', () => {
      expect(removeDiacritics('Olá Mundo!')).toBe('Ola Mundo!');
    });

    test('should handle strings with mixed diacritics and no diacritics', () => {
      expect(removeDiacritics('Crème brûlée')).toBe('Creme brulee');
    });

    test('should handle complex strings with various diacritics', () => {
      expect(removeDiacritics('déjà vu à la Pâtisserie')).toBe('deja vu a la Patisserie');
    });
  });

  describe('getScrollableListContainer', () => {
    test('should return null if no main container is found', () => {
      document.body.innerHTML = ''; // Ensure no main container
      expect(getScrollableListContainer()).toBeNull();
    });

    test('should return null if main container has no scrollable children and is not scrollable itself', () => {
      document.body.innerHTML = '<div role="main"><div id="child1"></div></div>';
      const mainContainer = document.querySelector('div[role="main"]');
      const child1 = document.getElementById('child1');
      
      // Mock scroll properties - main container not scrollable
      Object.defineProperty(mainContainer, 'scrollHeight', { value: 100 });
      Object.defineProperty(mainContainer, 'clientHeight', { value: 100 });
      // Mock scroll properties - child not scrollable
      Object.defineProperty(child1, 'scrollHeight', { value: 50 });
      Object.defineProperty(child1, 'clientHeight', { value: 50 });
      
      expect(getScrollableListContainer()).toBeNull();
    });

    test('should return the first scrollable child div', () => {
      document.body.innerHTML = '<div role="main"><div id="child1"></div><div id="child2"></div></div>';
      const mainContainer = document.querySelector('div[role="main"]');
      const child1 = document.getElementById('child1');
      const child2 = document.getElementById('child2');

      // Mock scroll properties - main container not scrollable initially
      Object.defineProperty(mainContainer, 'scrollHeight', { value: 200 });
      Object.defineProperty(mainContainer, 'clientHeight', { value: 200 });
      // Child1 not scrollable
      Object.defineProperty(child1, 'scrollHeight', { value: 50 });
      Object.defineProperty(child1, 'clientHeight', { value: 50 });
      // Child2 is scrollable (scrollHeight > clientHeight + 20)
      Object.defineProperty(child2, 'scrollHeight', { value: 150 });
      Object.defineProperty(child2, 'clientHeight', { value: 100 }); 

      expect(getScrollableListContainer()).toBe(child2);
    });

    test('should return the main container if it is scrollable and no children are', () => {
      document.body.innerHTML = '<div role="main" id="main"><div id="child1"></div></div>';
      const mainContainer = document.getElementById('main');
      const child1 = document.getElementById('child1');

      // Mock scroll properties - main container IS scrollable
      Object.defineProperty(mainContainer, 'scrollHeight', { value: 300 });
      Object.defineProperty(mainContainer, 'clientHeight', { value: 100 });
      // Child1 not scrollable
      Object.defineProperty(child1, 'scrollHeight', { value: 50 });
      Object.defineProperty(child1, 'clientHeight', { value: 50 });
      
      expect(getScrollableListContainer()).toBe(mainContainer);
    });

    test('should return the first scrollable child even if main container is also scrollable', () => {
      document.body.innerHTML = '<div role="main" id="main"><div id="scrollableChild"></div><div id="anotherChild"></div></div>';
      const mainContainer = document.getElementById('main');
      const scrollableChild = document.getElementById('scrollableChild');
      
      // Mock scroll properties - main container IS scrollable
      Object.defineProperty(mainContainer, 'scrollHeight', { value: 300 });
      Object.defineProperty(mainContainer, 'clientHeight', { value: 100 });
      // scrollableChild IS scrollable
      Object.defineProperty(scrollableChild, 'scrollHeight', { value: 150 });
      Object.defineProperty(scrollableChild, 'clientHeight', { value: 100 });

      expect(getScrollableListContainer()).toBe(scrollableChild);
    });

     test('should handle main container being scrollable but child height difference less than 20', () => {
      document.body.innerHTML = '<div role="main" id="main"><div id="child1"></div></div>';
      const mainContainer = document.getElementById('main');
      const child1 = document.getElementById('child1');

      // Child1 scrollHeight is only 10 more than clientHeight
      Object.defineProperty(child1, 'scrollHeight', { value: 60 });
      Object.defineProperty(child1, 'clientHeight', { value: 50 });

      // Main container IS scrollable (diff > 20)
      Object.defineProperty(mainContainer, 'scrollHeight', { value: 130 });
      Object.defineProperty(mainContainer, 'clientHeight', { value: 100 });
      
      expect(getScrollableListContainer()).toBe(mainContainer);
    });
  });

  describe('filterPlaces', () => {
    let listContainer;

    beforeEach(() => {
      // Ensure document.body is clean and then set up main container
      document.body.innerHTML = '<div role="main"></div>';
      listContainer = document.querySelector('div[role="main"]');
    });

    test('should show all items if query is empty', () => {
      const item1 = createPlaceItem('item1', 'Coffee Shop', 'Cafe', 'Good latte');
      const item2 = createPlaceItem('item2', 'Book Store', 'Retail', 'Great selection');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);

      filterPlaces('');

      expect(item1.style.display).toBe('');
      expect(item2.style.display).toBe('');
    });

    test('should filter by name (exact match, case insensitive)', () => {
      const item1 = createPlaceItem('item1', 'Pizza Place', 'Restaurant', '');
      const item2 = createPlaceItem('item2', 'Burger Joint', 'Restaurant', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);

      filterPlaces('pizza place');

      expect(item1.style.display).toBe('');
      expect(item2.style.display).toBe('none');
    });

    test('should filter by type/price (partial match)', () => {
      const item1 = createPlaceItem('item1', 'Sushi Spot', 'Japanese Dining', '');
      const item2 = createPlaceItem('item2', 'Taco Truck', 'Mexican Food', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);

      filterPlaces('food');

      expect(item1.style.display).toBe('none'); // Japanese Dining does not contain food
      expect(item2.style.display).toBe(''); // Mexican Food contains food
    });

    test('should filter by note (partial match)', () => {
      // For this test, the note needs to be findable by the current logic.
      // The simple createPlaceItem puts it as a sibling of itemDiv.
      // The real code: itemDiv.nextElementSibling.querySelector('textarea, div, span')
      // OR itemDiv.querySelector('textarea, div, span')
      // We will adjust the helper or the DOM for this test.

      document.body.innerHTML = '<div role="main"><div id="item1_parent"></div><div id="item2_parent"></div></div>';
      listContainer = document.querySelector('div[role="main"]');

      const parent1 = document.getElementById('item1_parent');
      const item1 = createPlaceItem('item1', 'Library', 'Public Service', '');
      parent1.appendChild(item1);
      const note1El = document.createElement('div'); // This will be item1.nextElementSibling
      note1El.innerHTML = '<span>Quiet study spot</span>';
      parent1.insertAdjacentElement('afterend', note1El); // Incorrect placement for test logic, needs to be sibling of parent1 if item1 is the target. Let's adjust
      // The unit test needs to reflect the DOM structure filterPlaces expects to find the note from.
      // `itemDiv` is the element that gets hidden/shown. Notes are searched relative to `itemDiv`.

      // Let's recreate the structure more carefully for note testing.
      // Each item (parentDiv) will contain its button and then potentially a note element *after* it or *within* it.
      // The logic in `filterPlaces` uses `itemDiv.nextElementSibling` or `itemDiv.querySelector`

      listContainer.innerHTML = ''; // Clear previous

      // Item 1: Note as next sibling
      const place1Div = document.createElement('div'); // This is the itemDiv that will be hidden/shown
      place1Div.id = 'place1';
      const btn1 = createPlaceItem('btn1', 'Park Cafe', 'Outdoor', 'no_inline_note').querySelector('button');
      place1Div.appendChild(btn1);
      listContainer.appendChild(place1Div);
      const note1Sibling = document.createElement('div');
      note1Sibling.innerHTML = '<span>Great for picnics</span>';
      place1Div.insertAdjacentElement('afterend', note1Sibling);

      // Item 2: Note inline (as a child of itemDiv)
      const place2Div = document.createElement('div');
      place2Div.id = 'place2';
      const btn2 = createPlaceItem('btn2', 'Museum', 'Culture', 'no_inline_note').querySelector('button');
      place2Div.appendChild(btn2);
      const note2Inline = document.createElement('div');
      note2Inline.textContent = 'Has new exhibit';
      note2Inline.className = 'item-note'; // Added class for detection
      place2Div.appendChild(note2Inline); // Note is a child of place2Div
      listContainer.appendChild(place2Div);
      
      // Item 3: No relevant note
      const place3Div = document.createElement('div');
      place3Div.id = 'place3';
      const btn3 = createPlaceItem('btn3', 'Gym', 'Fitness', 'no_inline_note').querySelector('button');
      place3Div.appendChild(btn3);
      listContainer.appendChild(place3Div);

      filterPlaces('exhibit');

      expect(place1Div.style.display).toBe('none');
      expect(place2Div.style.display).toBe(''); // Matches 'Has new exhibit'
      expect(place3Div.style.display).toBe('none');
    });

    test('should hide item if query does not match name, type, or note', () => {
      const item1 = createPlaceItem('item1', 'Bakery', 'Sweets', 'Fresh bread daily');
      listContainer.appendChild(item1);
      filterPlaces('unrelated');
      expect(item1.style.display).toBe('none');
    });

    test('should handle diacritics in query and item text', () => {
      // Create item without using the helper's note functionality, then add note manually
      const item1 = createPlaceItem('item1', 'Café Olé', 'Spanish Bistro', null);
      const noteEl = document.createElement('div');
      noteEl.textContent = 'Serves Pâtisserie';
      noteEl.className = 'item-note'; // Added class for detection
      item1.appendChild(noteEl); // Add note as a child of item1 (the itemDiv)
      listContainer.appendChild(item1);

      filterPlaces('cafe ole');
      expect(item1.style.display).toBe('');

      filterPlaces('patisserie');
      expect(item1.style.display).toBe('');

      filterPlaces('bistro');
      expect(item1.style.display).toBe('');
    });

    test('should extract textarea content for filtering', () => {
      const itemDiv = document.createElement('div');
      const button = document.createElement('button');
      button.innerHTML = '<img src="fake.jpg"><h3 class="fontHeadlineSmall">Veg Stall</h3>';
      itemDiv.appendChild(button);
      const noteContainer = document.createElement('div');
      const textarea = document.createElement('textarea');
      textarea.value = 'indian vege \ud83d\ude05';
      noteContainer.appendChild(textarea);
      itemDiv.appendChild(noteContainer);
      listContainer.appendChild(itemDiv);

      filterPlaces('indian');
      expect(itemDiv.style.display).toBe('');

      filterPlaces('', ['indian']);
      expect(itemDiv.style.display).toBe('none');
    });

    test('should correctly identify parent div for hiding/showing complex structures', () => {
      // Structure: main > wrapper > itemDiv (contains button) > button_content
      listContainer.innerHTML = ''; // Clear
      const wrapper = document.createElement('div');
      const itemDiv = document.createElement('div'); // This is the div that should be hidden/shown
      itemDiv.id = 'actualItem';
      const button = document.createElement('button');
      const img = document.createElement('img');
      img.src = 'fake.jpg';
      button.appendChild(img);
      const nameEl = document.createElement('h3');
      nameEl.textContent = 'Deeply Nested Item';
      button.appendChild(nameEl);
      itemDiv.appendChild(button);
      wrapper.appendChild(itemDiv);
      listContainer.appendChild(wrapper);

      filterPlaces('nested');
      expect(itemDiv.style.display).toBe('');
      
      filterPlaces('nonexistent');
      expect(itemDiv.style.display).toBe('none');
    });

    // Add more tests for edge cases in name/typePrice extraction, various DOM structures, etc.
  });

  describe('parseSearchInput', () => {
    test('should parse input with no exclude terms', () => {
      const result = window.parseSearchInput('restaurant coffee');
      expect(result.includeTerms).toEqual(['restaurant', 'coffee']);
      expect(result.excludeTerms).toEqual([]);
    });

    test('should parse input with only exclude terms', () => {
      const result = window.parseSearchInput('-expensive -closed');
      expect(result.includeTerms).toEqual([]);
      expect(result.excludeTerms).toEqual(['expensive', 'closed']);
    });

    test('should parse input with mixed include and exclude terms', () => {
      const result = window.parseSearchInput('restaurant -expensive coffee -starbucks');
      expect(result.includeTerms).toEqual(['restaurant', 'coffee']);
      expect(result.excludeTerms).toEqual(['expensive', 'starbucks']);
    });

    test('should handle empty input', () => {
      const result = window.parseSearchInput('');
      expect(result.includeTerms).toEqual([]);
      expect(result.excludeTerms).toEqual([]);
    });

    test('should handle whitespace only input', () => {
      const result = window.parseSearchInput('   ');
      expect(result.includeTerms).toEqual([]);
      expect(result.excludeTerms).toEqual([]);
    });

    test('should ignore standalone minus signs', () => {
      const result = window.parseSearchInput('restaurant - coffee');
      expect(result.includeTerms).toEqual(['restaurant', 'coffee']);
      expect(result.excludeTerms).toEqual([]);
    });

    test('should handle multiple spaces between terms', () => {
      const result = window.parseSearchInput('restaurant   -expensive    coffee');
      expect(result.includeTerms).toEqual(['restaurant', 'coffee']);
      expect(result.excludeTerms).toEqual(['expensive']);
    });

    test('should handle terms with special characters', () => {
      const result = window.parseSearchInput('café -$100+ pizza');
      expect(result.includeTerms).toEqual(['café', 'pizza']);
      expect(result.excludeTerms).toEqual(['$100+']);
    });
  });

  describe('filterPlaces with exclude functionality', () => {
    let listContainer;

    beforeEach(() => {
      document.body.innerHTML = '<div role="main"></div>';
      listContainer = document.querySelector('div[role="main"]');
    });

    test('should show all items when both include and exclude queries are empty', () => {
      const item1 = createPlaceItem('item1', 'Coffee Shop', 'Cafe', 'Good latte');
      const item2 = createPlaceItem('item2', 'Book Store', 'Retail', 'Great selection');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);

      filterPlaces('', []);

      expect(item1.style.display).toBe('');
      expect(item2.style.display).toBe('');
    });

    test('should exclude items matching exclude query only', () => {
      const item1 = createPlaceItem('item1', 'Expensive Restaurant', 'Fine Dining', '');
      const item2 = createPlaceItem('item2', 'Cheap Eats', 'Fast Food', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);

      filterPlaces('', ['expensive']);

      expect(item1.style.display).toBe('none'); // Contains 'expensive'
      expect(item2.style.display).toBe(''); // Doesn't contain 'expensive'
    });

    test('should apply both include and exclude filters', () => {
      const item1 = createPlaceItem('item1', 'Starbucks Coffee', 'Coffee Shop', '');
      const item2 = createPlaceItem('item2', 'Local Coffee Roasters', 'Coffee Shop', '');
      const item3 = createPlaceItem('item3', 'Pizza Place', 'Restaurant', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);
      listContainer.appendChild(item3);

      filterPlaces('coffee', ['starbucks']);

      expect(item1.style.display).toBe('none'); // Matches include 'coffee' but also matches exclude 'starbucks'
      expect(item2.style.display).toBe(''); // Matches include 'coffee' and doesn't match exclude 'starbucks'
      expect(item3.style.display).toBe('none'); // Doesn't match include 'coffee'
    });

    test('should exclude by type/price', () => {
      const item1 = createPlaceItem('item1', 'Fine Restaurant', '$100+ per person', '');
      const item2 = createPlaceItem('item2', 'Casual Diner', '$10-20 per person', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);

      filterPlaces('restaurant', ['$100']);

      expect(item1.style.display).toBe('none'); // Matches include 'restaurant' but also matches exclude '$100'
      expect(item2.style.display).toBe('none'); // Doesn't match include 'restaurant' (has 'diner')
    });

    test('should exclude by note content', () => {
      // Create items with inline notes
      listContainer.innerHTML = '';
      
      const place1 = document.createElement('div');
      place1.id = 'place1';
      const btn1 = createPlaceItem('btn1', 'Park Cafe', 'Outdoor', '').querySelector('button');
      place1.appendChild(btn1);
      const note1 = document.createElement('div');
      note1.textContent = 'Currently closed for renovation';
      note1.className = 'item-note';
      place1.appendChild(note1);
      listContainer.appendChild(place1);

      const place2 = document.createElement('div');
      place2.id = 'place2';
      const btn2 = createPlaceItem('btn2', 'Beach Cafe', 'Outdoor', '').querySelector('button');
      place2.appendChild(btn2);
      const note2 = document.createElement('div');
      note2.textContent = 'Great ocean view';
      note2.className = 'item-note';
      place2.appendChild(note2);
      listContainer.appendChild(place2);

      filterPlaces('cafe', ['closed']);

      expect(place1.style.display).toBe('none'); // Matches include 'cafe' but also matches exclude 'closed'
      expect(place2.style.display).toBe(''); // Matches include 'cafe' and doesn't match exclude 'closed'
    });

    test('should handle diacritics in exclude queries', () => {
      const item1 = createPlaceItem('item1', 'Café Français', 'French Bistro', '');
      const item2 = createPlaceItem('item2', 'American Diner', 'Classic Food', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);

      filterPlaces('', ['francais']); // Search without diacritics

      expect(item1.style.display).toBe('none'); // 'Français' should match 'francais'
      expect(item2.style.display).toBe(''); // Doesn't contain 'francais'
    });

    test('should exclude items when include filter passes but exclude filter matches', () => {
      const item1 = createPlaceItem('item1', 'McDonald\'s', 'Fast Food Restaurant', '');
      const item2 = createPlaceItem('item2', 'Local Burger Joint', 'Fast Food Restaurant', '');
      const item3 = createPlaceItem('item3', 'Pizza Palace', 'Italian Restaurant', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);
      listContainer.appendChild(item3);

      filterPlaces('restaurant', ['mcdonald']);

      expect(item1.style.display).toBe('none'); // Matches include 'restaurant' but also matches exclude 'mcdonald'
      expect(item2.style.display).toBe(''); // Matches include 'restaurant' and doesn't match exclude 'mcdonald'
      expect(item3.style.display).toBe(''); // Matches include 'restaurant' and doesn't match exclude 'mcdonald'
    });

    test('should show items that match include but not exclude', () => {
      const item1 = createPlaceItem('item1', 'Expensive Sushi', 'Japanese $$$', '');
      const item2 = createPlaceItem('item2', 'Affordable Sushi', 'Japanese $', '');
      const item3 = createPlaceItem('item3', 'Cheap Pizza', 'Italian $', '');
      listContainer.appendChild(item1);
      listContainer.appendChild(item2);
      listContainer.appendChild(item3);

      filterPlaces('japanese', ['expensive']);

      expect(item1.style.display).toBe('none'); // Matches include 'japanese' but also matches exclude 'expensive'
      expect(item2.style.display).toBe(''); // Matches include 'japanese' and doesn't match exclude 'expensive'
      expect(item3.style.display).toBe('none'); // Doesn't match include 'japanese'
    });
  });

  describe('loading state functionality', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div role="main"></div>';
      // Inject the filter UI so loading indicator exists
      window.injectFilterUI();
    });

    test('should show loading indicator when showLoadingState is called', () => {
      const loadingIndicator = document.getElementById('loading-indicator');
      expect(loadingIndicator).not.toBeNull();
      expect(loadingIndicator.style.display).toBe('none'); // Initially hidden

      window.showLoadingState();
      expect(loadingIndicator.style.display).toBe('flex');
    });

    test('should hide loading indicator when hideLoadingState is called', () => {
      const loadingIndicator = document.getElementById('loading-indicator');
      window.showLoadingState();
      expect(loadingIndicator.style.display).toBe('flex');

      window.hideLoadingState();
      expect(loadingIndicator.style.display).toBe('none');
    });

    test('should update progress text when updateLoadingProgress is called', () => {
      const listContainer = document.querySelector('div[role="main"]');
      
      // Add some mock buttons to simulate places
      const mockButton1 = document.createElement('button');
      mockButton1.innerHTML = '<img src="test.jpg"><h3 class="fontHeadlineSmall">Test Place 1</h3>';
      listContainer.appendChild(mockButton1);
      
      const mockButton2 = document.createElement('button');
      mockButton2.innerHTML = '<img src="test.jpg"><h3 class="fontHeadlineSmall">Test Place 2</h3>';
      listContainer.appendChild(mockButton2);

      window.updateLoadingProgress();

      const loadingText = document.querySelector('#loading-indicator span');
      expect(loadingText.textContent).toBe('Loading places... (2 found)');
    });
  });

  describe('list navigation detection', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div role="main"></div>';
      window.injectFilterUI();
    });

    test('should generate different identifiers for different lists', () => {
      const listContainer = document.querySelector('div[role="main"]');
      
      // Add mock buttons for first list
      const mockButton1 = document.createElement('button');
      mockButton1.innerHTML = '<img src="test.jpg"><h3 class="fontHeadlineSmall">Coffee Shop</h3>';
      listContainer.appendChild(mockButton1);
      
      const firstIdentifier = window.getListIdentifier(listContainer);

      // Clear and add different content
      listContainer.innerHTML = '';
      const mockButton2 = document.createElement('button');
      mockButton2.innerHTML = '<img src="test.jpg"><h3 class="fontHeadlineSmall">Restaurant</h3>';
      listContainer.appendChild(mockButton2);
      
      const secondIdentifier = window.getListIdentifier(listContainer);

      expect(firstIdentifier).not.toBe(secondIdentifier);
    });

    test('should generate same identifier for same list content', () => {
      const listContainer = document.querySelector('div[role="main"]');
      
      // Add mock buttons
      const mockButton1 = document.createElement('button');
      mockButton1.innerHTML = '<img src="test.jpg"><h3 class="fontHeadlineSmall">Coffee Shop</h3>';
      listContainer.appendChild(mockButton1);
      
      const firstIdentifier = window.getListIdentifier(listContainer);
      const secondIdentifier = window.getListIdentifier(listContainer);

      expect(firstIdentifier).toBe(secondIdentifier);
    });

    test('should handle custom loading messages', () => {
      window.showLoadingState('Custom loading message');
      
      const loadingText = document.querySelector('#loading-indicator span');
      expect(loadingText.textContent).toBe('Custom loading message');
    });
  });

  describe('list overview detection', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div role="main"></div>';
    });

    test('should detect lists overview page by text content', () => {
      document.body.innerHTML = `
        <div role="main">
          <div>Lists you saved</div>
          <div>Starred places</div>
          <div>Private • 3 places</div>
        </div>
      `;
      
      expect(window.isListOverviewPage()).toBe(true);
    });

    test('should detect list cards with metadata', () => {
      document.body.innerHTML = `
        <div role="main">
          <button>Coffee & Eat in Bali<br>By Mikhael Andarias • 134 places</button>
          <button>Travel plans<br>Private • 0 places</button>
        </div>
      `;
      
      expect(window.isListOverviewPage()).toBe(true);
    });

    test('should not detect overview when viewing actual place content', () => {
      const listContainer = document.querySelector('div[role="main"]');
      
      // Add actual place buttons (not list cards)
      const placeButton = document.createElement('button');
      placeButton.innerHTML = '<img src="test.jpg"><h3 class="fontHeadlineSmall">Cafe Central</h3><span>Coffee Shop</span>';
      listContainer.appendChild(placeButton);
      
      expect(window.isListOverviewPage()).toBe(false);
      expect(window.hasPlaceContent(listContainer)).toBe(true);
    });

    test('should detect when there is no place content', () => {
      const listContainer = document.querySelector('div[role="main"]');
      
      // Add list cards (not actual places)
      const listCard = document.createElement('button');
      listCard.textContent = 'My Travel List\nPrivate • 5 places';
      listContainer.appendChild(listCard);
      
      expect(window.hasPlaceContent(listContainer)).toBe(false);
    });

    test('should distinguish between place buttons and list cards', () => {
      const listContainer = document.querySelector('div[role="main"]');
      
      // Add a list card
      const listCard = document.createElement('button');
      listCard.textContent = 'Restaurant List\nBy John Doe • 15 places';
      listContainer.appendChild(listCard);
      
      // Add an actual place button
      const placeButton = document.createElement('button');
      placeButton.innerHTML = '<img src="test.jpg"><h3 class="fontHeadlineSmall">Pizza Palace</h3><span>Italian Restaurant</span>';
      listContainer.appendChild(placeButton);
      
      // Should detect place content because there's at least one actual place
      expect(window.hasPlaceContent(listContainer)).toBe(true);
    });
  });
}); 