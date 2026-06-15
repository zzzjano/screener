/** Lightweight concurrency limiter (p-limit style) without extra dependencies. */
export function createLimit(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active += 1;
    const run = queue.shift();
    run?.();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      };

      queue.push(execute);
      next();
    });
  };
}

export async function mapWithLimit<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = createLimit(concurrency);
  return Promise.all(items.map((item, index) => limit(() => worker(item, index))));
}
