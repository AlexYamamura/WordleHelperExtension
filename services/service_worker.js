const WORDLE_ORIGIN = 'https://www.nytimes.com/games/wordle/index.html';
let currentTabId = null;

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  onWordlePage(url.href, tabId);
});

chrome.tabs.onActivated.addListener(({tabId, windowId}) => {
  currentTabId = tabId;
  let promise = chrome.tabs.get(tabId)
  .then(function(tab) {
    if (!tab.url) return;
    return onWordlePage(tab.url, tabId);
  })
  return promise;
}); 

function onWordlePage(url, tabId) {
  let promise
  if (url === WORDLE_ORIGIN) {
    promise = chrome.sidePanel.setOptions({
      tabId,
      path: 'html/sidePanel.html',
      enabled: true
    });
  } else {
    // Disables the side panel on all other sites
    promise = chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
  return true;
}

function calculateWordBank(wordBank, guess, states) {

  let result = '';
  // Initialize base (correct) and Negative base (letters that cannot be at those positions)
  let regexBase = ['','','','',''];
  let regexNegativeBase = ['[^','[^','[^','[^','[^'];
  let lookaheadMap = new Map();

  for (let i = 0; i < guess.length; i++) {

    let letter = guess[i];
    let state = states[i];
    if (state == "correct") {
      regexBase[i] = '[' + letter + ']';
    } else if (state == "absent") {

      // Set all negative indexes for current letter to exclude from word
      regexNegativeBase.forEach((l, index) => {
        regexNegativeBase[index] += letter;
      });

      // If absent, set absent flag to true and determine if lookahead is needed later
      // Will create lookahead based on count > 0 and absent flag true to account for order of present/absent letters
      let {count, hasAbsent} = lookaheadMap.get(letter) ?? {count: 0, hasAbsent: true};
      lookaheadMap.set(letter, {
        count: count,
        hasAbsent: hasAbsent || false
      });
    } else if (state == "present") {

      // Not at current position but exists elsewhere, increment lookahead map values
      regexNegativeBase[i] += letter;
      let {count, hasAbsent} = lookaheadMap.get(letter) ?? {count: 0, hasAbsent: false};
      lookaheadMap.set(letter, {
          count: count + 1,
          hasAbsent: hasAbsent || false
        });
    } else {
      // Redundant?
      // Only state left is tbd which should not be sent through
    }
  }

  // Replace any non-found letters with negative base regex to exclude letters in those positions
  for (let i = 0; i < guess.length; i++) {
    if (!regexBase[i]) {
      regexBase[i] = regexNegativeBase[i] + ']'; // Close the expression
    }
  }

  for (let [lookahead, {count, hasAbsent}] of lookaheadMap) {
    if (count == 0) {
      continue;
    } else if (hasAbsent) {
      let lookaheadPattern = `^(?=([^${lookahead}]*${lookahead}){${count}}[^${lookahead}]*$)`;
      result += lookaheadPattern;
    } else {
      let lookaheadPattern = `^(?=([^${lookahead}]*${lookahead}){${count}})`;
      result += lookaheadPattern;
    }
  }

  let regex = new RegExp(result + regexBase.join(''),'m');

  let updatedWordBank = wordBank.filter((word) => regex.test(word))
  return updatedWordBank;
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.word) {
      chrome.sidePanel.open({
        tabId: currentTabId
      });

      chrome.storage.session.get(['wordBank'])
      .then((result) => result.wordBank)
      .then((wordBank) => calculateWordBank(wordBank, request.word, request.states))
      .then((newWordBank) => chrome.storage.session.set({wordBank: newWordBank}));
    }
    return true;
  }
);

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
