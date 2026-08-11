declare const flavour: unique symbol;

export type Flavour<T, K extends string> = T & { readonly [flavour]?: K };

export type Timestamp = Flavour<number, 'timestamp'>;
