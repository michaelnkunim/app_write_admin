import algoliasearch from 'algoliasearch/lite';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? '';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? '';
const ALGOLIA_INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? 'casaListings';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const searchIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);

export { searchClient, searchIndex }; 