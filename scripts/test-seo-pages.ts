import assert from "node:assert/strict";
import { MOCK_TUTORS } from "../lib/mock-tutors";
import { findLabelBySlug, slugsMatch, toSeoSlug } from "../lib/seo/slugs";
import {
  cityPreposition,
  filterTutorsForSubjectCity,
  getPopularSubjectCityPairs,
  resolveSubjectCity,
  subjectCityHeading,
  subjectCityPath,
} from "../lib/seo/subject-city";

assert.equal(toSeoSlug("Inglês"), "ingles");
assert.equal(toSeoSlug("São Paulo"), "sao-paulo");
assert.equal(toSeoSlug("Rio de Janeiro"), "rio-de-janeiro");
assert.equal(toSeoSlug("Matemática"), "matematica");
assert.equal(toSeoSlug("Violão"), "violao");
assert.equal(slugsMatch("São Paulo", "sao-paulo"), true);
assert.equal(findLabelBySlug(["Inglês", "Python"], "ingles"), "Inglês");

assert.equal(cityPreposition("São Paulo"), "em");
assert.equal(cityPreposition("Rio de Janeiro"), "no");
assert.equal(
  subjectCityHeading("Inglês", "São Paulo"),
  "Professores de Inglês em São Paulo",
);
assert.equal(
  subjectCityHeading("Violão", "Rio de Janeiro"),
  "Professores de Violão no Rio de Janeiro",
);
assert.equal(subjectCityPath("Inglês", "São Paulo"), "/professores/ingles/sao-paulo");

const pairs = getPopularSubjectCityPairs(MOCK_TUTORS);
const pairKeys = pairs.map((pair) => `${pair.materia}/${pair.cidade}`);

assert.ok(pairKeys.includes("ingles/sao-paulo"));
assert.ok(pairKeys.includes("python/curitiba"));
assert.ok(pairKeys.includes("violao/rio-de-janeiro"));
assert.ok(pairKeys.includes("matematica/belo-horizonte"));
assert.ok(pairKeys.includes("espanhol/porto-alegre"));

const uniqueSubjects = new Set(MOCK_TUTORS.map((tutor) => tutor.subject));
const uniqueCities = new Set(MOCK_TUTORS.map((tutor) => tutor.city));
assert.equal(pairs.length, uniqueSubjects.size * uniqueCities.size);

const resolved = resolveSubjectCity(MOCK_TUTORS, "ingles", "sao-paulo");
assert.deepEqual(resolved, {
  subject: "Inglês",
  city: "São Paulo",
  state: "SP",
});
assert.equal(resolveSubjectCity(MOCK_TUTORS, "frances", "recife"), undefined);

const localMatch = filterTutorsForSubjectCity(MOCK_TUTORS, "Inglês", "São Paulo");
assert.equal(localMatch.local.length, 1);
assert.equal(localMatch.local[0]?.name, "Mariana Silva");

const remoteCity = filterTutorsForSubjectCity(MOCK_TUTORS, "Inglês", "Curitiba");
assert.equal(remoteCity.local.length, 0);
assert.equal(remoteCity.online.length, 1);
assert.equal(remoteCity.online[0]?.name, "Mariana Silva");

console.log(`ok ${pairs.length} subject×city pairs`);
