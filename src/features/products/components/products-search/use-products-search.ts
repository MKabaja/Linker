import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';

type ProductsSearchState = {
	searchText: string;
	changeSearchText: (text: string) => void;
	isPending: boolean;
};

const SEARCH_DEBOUNCE_MILLISECONDS = 300;

/**
 * Synchronizuje pole wyszukiwania z parametrem `q` w adresie. Hasło trafia do
 * adresu po 300 ms bez pisania i wraca na pierwszą stronę. Zmiana `q` z
 * zewnątrz nadpisuje wpisany tekst.
 *
 * @returns Stan pola wyszukiwania.
 * @property searchText Tekst widoczny w polu, aktualizowany od razu.
 * @property changeSearchText Ustawia tekst i planuje zapis hasła w adresie.
 * @property isPending `true`, dopóki trwa nawigacja z nowym hasłem.
 * @example
 * const { searchText, changeSearchText, isPending } = useProductsSearch();
 */
export function useProductsSearch(): ProductsSearchState {
	const router = useRouter();
	const urlQuery = useSearchParams().get('q') ?? '';
	const [searchText, setSearchText] = useState(urlQuery);
	const [sentQuery, setSentQuery] = useState(urlQuery);
	const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
	const [isPending, startTransition] = useTransition();

	if (urlQuery !== seenUrlQuery) {
		setSeenUrlQuery(urlQuery);

		if (urlQuery !== sentQuery) {
			setSentQuery(urlQuery);
			setSearchText(urlQuery);
		}
	}

	const updateUrlQuery = useDebouncedCallback((text: string) => {
		const query = text.trim();

		if (query === sentQuery) {
			return;
		}

		setSentQuery(query);
		startTransition(() => router.replace(buildSearchHref(query)));
	}, SEARCH_DEBOUNCE_MILLISECONDS);

	function changeSearchText(text: string) {
		setSearchText(text);
		updateUrlQuery(text);
	}

	return { searchText, changeSearchText, isPending };
}

function buildSearchHref(query: string): Route {
	if (query === '') {
		return '/products';
	}

	return `/products?${new URLSearchParams({ q: query })}`;
}
