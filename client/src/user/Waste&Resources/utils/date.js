export function displayDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function monthKey(iso) {
  return iso.slice(0, 7);
}

export function monthName(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
