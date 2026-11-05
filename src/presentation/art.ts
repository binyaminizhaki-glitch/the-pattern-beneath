export const art = (name: string) => `${import.meta.env.BASE_URL}art/${name}.webp`;
export const characterArt = (id: string): string | null =>
  id === 'citizen-0'
    ? 'clara'
    : id === 'citizen-5'
      ? 'physician'
      : id === 'citizen-29'
        ? 'editor'
        : null;
