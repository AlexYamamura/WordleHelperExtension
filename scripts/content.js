
initialize();

function initialize() {
    let promise = initializeWordBank()
    .then(function() {
        return waitForElm('.Board-module_boardContainer__TBHNL')
    }).then(initObservers)
}

function initializeWordBank() {
    let url = chrome.runtime.getURL('resources/wordBank.txt');
    let promise = fetch(url)
    .then((textFile) => textFile.text())
    .then((text) => text.split("\n"))
    .then((wordBank) => chrome.storage.session.set({'wordBank': wordBank}));
    return promise;
  }

function initObservers() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach((mutation) => {
            let rowParent = mutation.target.closest('.Row-module_row__pwpBq')

            let rowStates = $(rowParent).find('.Tile-module_tile__UWEHN').map(function() { return this.dataset.state });

            let rowComplete = rowStates.toArray().every((state) => {
                return state !== 'tbd';
            })
            
            if(rowComplete) {
                checkWord(rowParent.textContent, rowStates);
            }
        })
        
    });

    let board = document.querySelector('.Board-module_board__jeoPS');

    observer.observe(board, {
        subtree: true,
        attributes: true,
        attributeFilter: ['data-state']
    });
}

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function checkWord(word, states) {
    chrome.runtime.sendMessage({"word":word, "states": states});
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if(request.wordlistGuess) {
        
      }
      return true;
    }
  );