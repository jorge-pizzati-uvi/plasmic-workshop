// Server-loader registrations (RSC only). Imported for its side effect by
// lib/plasmic/lookup.tsx.
//
// Plasmic executes `$q` data queries on the server through
// PLASMIC.getPlasmicQueriesData, which resolves the functions a page uses from
// the loader's own registry. Functions therefore have to be registered on the
// SERVER loaders here, in addition to the client loaders in
// host-registrations.ts (Studio canvas + browser).
//
// Code components are not needed here: server queries are executed from a
// generated query tree, not by rendering components.
import { PLASMIC, PREVIEW_PLASMIC } from '@/lib/plasmic/init-server';
import { getPosts, getPostsMeta } from '@/lib/plasmic/data/posts';

type ServerLoader = NonNullable<typeof PLASMIC>;

function registerServerFunctions(loader: ServerLoader) {
  loader.registerFunction(getPosts, getPostsMeta);
}

if (PLASMIC) {
  registerServerFunctions(PLASMIC);
}
if (PREVIEW_PLASMIC) {
  registerServerFunctions(PREVIEW_PLASMIC);
}
