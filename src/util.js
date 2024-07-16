export async function fetchTemplate(filePath) {
  const response = await fetch(filePath);
  const templateElement = document.createElement('template');
  templateElement.innerHTML = await response.text();
  return templateElement.content;
}