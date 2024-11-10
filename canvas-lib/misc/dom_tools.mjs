export function removeNode(node) {
  node.parentNode.removeChild(node);
}

export function removeAllNodes(parentElem) {
  Array.from(parentElem.childNodes).forEach(elem => parentElem.removeChild(elem));
}
