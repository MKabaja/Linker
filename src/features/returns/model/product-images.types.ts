type ProductImageRecord = {
	productId: number;
	ean: string;
	/** `''`, gdy BaseLinker nie ma zdjęcia produktu. */
	imageUrl: string;
	syncedAt: Date;
};

type ImageUrlByItemId = Record<number, string>;

export type { ImageUrlByItemId, ProductImageRecord };
