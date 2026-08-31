import assert from "node:assert/strict";
import { MOCK_TUTORS } from "../lib/mock-tutors";
import { findLabelBySlug, slugsMatch, toSeoSlug } from "../lib/seo/slugs";
import { buildSitemapEntries } from "../lib/seo/sitemap-entries";
import {
  cityPreposition,
  filterTutorsForSubjectCity,
  getIndexableSubjectCityPairs,
  resolveSubjectCity,
  subjectCityHeading,
  subjectCityPath,
  subjectCitySeoCopy,
} from "../lib/seo/subject-city";
import { buildTutorPersonJsonLd, serializeJsonLd } from "../lib/seo/tutor-jsonld";

assert.equal(toSeoSlug("Inglês"), "ingles");
assert.equal(toSeoSlug("São Paulo"), "sao-paulo");
assert.equal(slugsMatch("São Paulo", "sao-paulo"), true);
assert.equal(findLabelBySlug(["Inglês", "Python"], "ingles"), "Inglês");
assert.equal(cityPreposition("Rio de Janeiro"), "no");
assert.equal(subjectCityHeading("Inglês", "São Paulo"), "Professores de Inglês em São Paulo");
assert.equal(subjectCityPath("Inglês", "São Paulo"), "/professores/ingles/sao-paulo");

const pairs = getIndexableSubjectCityPairs(MOCK_TUTORS);
const pairKeys = pairs.map((pair) => `${pair.materia}/${pair.cidade}`);
assert.ok(pairKeys.includes("ingles/sao-paulo"));
assert.ok(!pairKeys.includes("ingles/curitiba"));
assert.equal(pairs.length, MOCK_TUTORS.length);

assert.equal(resolveSubjectCity(MOCK_TUTORS, "frances", "recife"), undefined);
assert.equal(filterTutorsForSubjectCity(MOCK_TUTORS, "Inglês", "Curitiba").local.length, 0);
assert.equal(subjectCitySeoCopy("Inglês", "Curitiba", false).indexable, false);

const person = buildTutorPersonJsonLd(MOCK_TUTORS[0]!, "https://www.aprendizbay.com.br");
assert.equal(person?.["@type"], "Person");
assert.equal(person?.aggregateRating?.reviewCount, 84);
assert.equal(buildTutorPersonJsonLd({ ...MOCK_TUTORS[0]!, reviewCount: 0 })?.aggregateRating, undefined);
assert.ok(!serializeJsonLd({ html: "<script>" }).includes("<script>"));

const sitemapUrls = buildSitemapEntries({
  origin: "https://www.aprendizbay.com.br",
  tutors: MOCK_TUTORS,
  tutorIds: MOCK_TUTORS.map((tutor) => tutor.id),
}).map((entry) => entry.url);
assert.ok(sitemapUrls.includes("https://www.aprendizbay.com.br/professores/ingles/sao-paulo"));
assert.ok(!sitemapUrls.includes("https://www.aprendizbay.com.br/professores/ingles/curitiba"));

console.log(`ok ${pairs.length} indexable subject×city pairs + tutor JSON-LD`);
