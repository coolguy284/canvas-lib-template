export async function fetchAsText(url) {
  return await (await fetch(url)).text();
}
