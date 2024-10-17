function renderSidebar(wordlist) {
    let wordlistContainer = $('#wordlist');
    wordlistContainer.empty();
    wordlist.forEach(word => {
      word = word.toUpperCase();
      let listItem = generateWordHTML(word);
      wordlistContainer.append(listItem);
    })
}

function generateWordHTML(word) {
  return `<button class="wordItem onclick='triggerGuess(${word})">${word}</button>`;
}

function triggerGuess(word) {
  chrome.runtime.sendMessage({"wordlistGuess":word});
}

chrome.storage.session.get(['wordBank'], (result) => {
  let wordList = result.wordBank;
  if (wordList == null){
    return;
  }
  renderSidebar(wordList);
}) 

chrome.storage.session.onChanged.addListener((changes) => {
  let wordlist = changes['wordBank'];
  renderSidebar(wordlist.newValue);
})