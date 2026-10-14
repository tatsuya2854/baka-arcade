// スマホ振動。iOS Safari は navigator.vibrate 非対応のため、無ければ何もしない（見た目と音で補う）。
export const haptic = (p: number | number[] = 10) => { try { navigator.vibrate?.(p); } catch { /* */ } };
