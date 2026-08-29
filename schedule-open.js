export function scheduleOpen(fn, { gen, getGen, wait }) {
  return wait().then(() => {
    if (gen !== getGen()) return false;
    fn();
    return true;
  });
}
