// Content script for Toggl YouTrack Extension Fixer
// Finds elements with class starting with "idLink__" and adds "idLink__ee62" class

function addIdLinkClass() {
  // Find all elements with class starting with "idLink__"
  const elements = document.querySelectorAll('[class^="idLink__"]');

  // Add the "idLink__ee62" class to each found element
  elements.forEach(element => {
    if (!element.classList.contains('idLink__ee62')) {
      element.classList.add('idLink__ee62');
      console.log('Added idLink__ee62 class to element:', element);
    }
  });

  console.log(`Processed ${elements.length} idLink elements`);
}

// Run immediately when script loads
addIdLinkClass();

// Also run when DOM changes (for dynamically loaded content)
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;

  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if any added nodes contain idLink elements
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches && node.matches('[class^="idLink__"]')) {
            shouldProcess = true;
          } else if (node.querySelector && node.querySelector('[class^="idLink__"]')) {
            shouldProcess = true;
          }
        }
      });
    }
  });

  if (shouldProcess) {
    addIdLinkClass();
  }
});

// Start observing DOM changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('Toggl YouTrack Extension Fixer loaded and monitoring for idLink elements');