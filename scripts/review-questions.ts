/**
 * Auxiliar de revisão humana das 200 questões (P0.3 / gate D26).
 *
 * Este script NÃO aprova nada. Ele apenas torna a revisão humana mais rápida:
 * imprime as questões em um formato legível e sinaliza automaticamente os
 * cheiros da rubrica do `prd.md` §10 que exigem olho humano.
 *
 * Uso:
 *   npm run review -- --level=1              # um nível (40 questões)
 *   npm run review -- --level=1 --full       # com enunciado e explicação
 *   npm run review -- --flags                # só os avisos da rubrica
 *
 * A aprovação continua sendo humana: preencher `meta.reviewed_by` e
 * `meta.reviewed_at` em `supabase/seed/questions.json`.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type Option = { body: string; correct: boolean };
type Question = {
  externalId: string;
  level: string;
  subject: string;
  prompt: string;
  explanation: string;
  options: Option[];
};

type Seed = {
  meta: { version: number; reviewed_by: string; reviewed_at: string; source: string };
  questions: Question[];
};

const LEVELS: Record<string, number> = {
  facil: 1,
  basico: 2,
  intermediario: 3,
  avancado: 4,
  especialista: 5,
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Fácil",
  2: "Média",
  3: "Desafiadora",
  4: "Difícil",
  5: "Expert",
};

const SUBJECT_NAMES: Record<string, string> = {
  fundamentos: "Fundamentos OpenCode e CLI",
  configuracao: "Features e Produtividade",
  fluxo: "Boas práticas de uso",
};

/** Absorventes: não podem existir como distrator (rubrica do prd.md §10). */
const ABSORPTIVE = [
  "todas as anteriores",
  "todas acima",
  "nenhuma das acima",
  "nenhuma das alternativas",
  "todos os anteriores",
  "todas as opções acima",
  "qualquer um dos anteriores",
];

/** Palavras que sugerem que a resposta correta é óbvia por exclusão. */
const OBVIOUS_PREFIXES = ["não é", "apenas", "somente", "exclusivamente"];

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

type Flag = { level: "erro" | "aviso"; id: string; message: string };

/**
 * Cheiros da rubrica. `erro` = viola a rubrica de forma objetiva;
 * `aviso` = exige julgamento humano (não reprova sozinho).
 */
function checkQuestion(question: Question, all: Question[]): Flag[] {
  const flags: Flag[] = [];
  const id = question.externalId;
  const correct = question.options.filter((o) => o.correct);
  const wrong = question.options.filter((o) => !o.correct);

  if (correct.length !== 1) {
    flags.push({
      level: "erro",
      id,
      message: `esperado 1 alternativa correta; encontrado ${correct.length}`,
    });
  }

  for (const option of wrong) {
    const body = normalize(option.body);
    if (ABSORPTIVE.some((phrase) => body.includes(phrase))) {
      flags.push({
        level: "erro",
        id,
        message: `distrator absorvente (proibido pela rubrica): "${option.body}"`,
      });
    }
  }

  // Comprimento-delator: distrator muito mais longo que a mediana do parágrafo.
  const lengths = question.options.map((o) => o.body.length);
  const med = median(lengths);
  if (med > 0) {
    for (const option of wrong) {
      if (option.body.length > med * 2.2 && option.body.length - med > 25) {
        flags.push({
          level: "aviso",
          id,
          message: `distrator muito mais longo que a mediana (${option.body.length} vs ${med}): "${option.body}"`,
        });
      }
    }
    const correctOption = correct[0];
    if (correctOption && correctOption.body.length > med * 2.2 && correctOption.body.length - med > 25) {
      flags.push({
        level: "aviso",
        id,
        message: `alternativa correta muito mais longa que a mediana (${correctOption.body.length} vs ${med}) — delata a resposta`,
      });
    }
  }

  // Enunciado duplicado no banco inteiro.
  const prompt = normalize(question.prompt);
  const duplicates = all.filter((q) => normalize(q.prompt) === prompt && q.externalId !== id);
  if (duplicates.length > 0) {
    flags.push({
      level: "erro",
      id,
      message: `enunciado duplicado com ${duplicates.map((q) => q.externalId).join(", ")}`,
    });
  }

  // Enunciado que já contém a alternativa correta (resposta óbvia por leitura).
  const correctBody = correct[0] ? normalize(correct[0].body) : "";
  if (correctBody.length > 12 && prompt.includes(correctBody)) {
    flags.push({
      level: "aviso",
      id,
      message: "o enunciado contém literalmente a alternativa correta",
    });
  }

  if (question.explanation.trim().length < 20) {
    flags.push({ level: "erro", id, message: "explicação curta demais (rubrica: 1–3 frases que ensinam)" });
  }
  if (question.explanation.trim().length > 600) {
    flags.push({ level: "aviso", id, message: "explicação longa demais (rubrica: 1–3 frases)" });
  }

  // Distrator com cara de negação genérica.
  for (const option of wrong) {
    const body = normalize(option.body);
    if (body.length < 40 && OBVIOUS_PREFIXES.some((p) => body.startsWith(p))) {
      flags.push({
        level: "aviso",
        id,
        message: `possível distrator por exclusão: "${option.body}"`,
      });
    }
  }

  return flags;
}

function printQuestion(question: Question, index: number, full: boolean): void {
  const correct = question.options.find((o) => o.correct);
  console.log("");
  console.log(`${index}. ${question.externalId}  [${SUBJECT_NAMES[question.subject] ?? question.subject}]`);
  console.log(`   PERGUNTA: ${question.prompt}`);
  console.log(`   CORRETA : ${correct ? correct.body : "(nenhuma!)"}`);
  if (full) {
    console.log("   DISTRATORES:");
    for (const option of question.options.filter((o) => !o.correct)) {
      console.log(`     - ${option.body}`);
    }
    console.log(`   EXPLICAÇÃO: ${question.explanation}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const levelArg = args.find((arg) => arg.startsWith("--level="))?.split("=")[1];
  const flagsOnly = args.includes("--flags");
  const full = args.includes("--full");

  const raw = await readFile(resolve("supabase/seed/questions.json"), "utf8");
  const seed = JSON.parse(raw) as Seed;

  let questions = seed.questions;
  if (levelArg) {
    const level = LEVELS[levelArg] ?? Number(levelArg);
    if (!level || !LEVEL_NAMES[level]) {
      throw new Error(
        `Nível inválido: ${levelArg}. Use o número (1–5) ou o slug (${Object.keys(LEVELS).join(", ")}).`,
      );
    }
    questions = questions.filter((q) => LEVELS[q.level] === level);
  }

  const allFlags: Flag[] = [];
  for (const question of questions) {
    allFlags.push(...checkQuestion(question, seed.questions));
  }

  const errors = allFlags.filter((f) => f.level === "erro");
  const warnings = allFlags.filter((f) => f.level === "aviso");

  if (flagsOnly) {
    console.log(`Questões no recorte: ${questions.length}`);
    console.log(`Erros de rubrica: ${errors.length} · Avisos: ${warnings.length}`);
    for (const flag of allFlags) {
      console.log(`  [${flag.level === "erro" ? "ERRO" : "AVISO"}] ${flag.id}: ${flag.message}`);
    }
    if (errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (levelArg) {
    const level = LEVELS[levelArg] ?? Number(levelArg);
    console.log(`Nível ${level} — ${LEVEL_NAMES[level]} — ${questions.length} questões`);
  } else {
    console.log(`Todas as ${questions.length} questões`);
  }
  console.log(`Meta: reviewed_by="${seed.meta.reviewed_by}" reviewed_at="${seed.meta.reviewed_at}"`);

  let counter = 0;
  for (const question of questions) {
    counter += 1;
    printQuestion(question, counter, full);
  }

  console.log("");
  console.log("=".repeat(72));
  console.log(`Erros de rubrica: ${errors.length} · Avisos: ${warnings.length}`);
  for (const flag of allFlags) {
    console.log(`  [${flag.level === "erro" ? "ERRO" : "AVISO"}] ${flag.id}: ${flag.message}`);
  }
  if (errors.length > 0) {
    console.log("");
    console.log("Há ERROS objetivos de rubrica: corrija em supabase/seed/questions.json.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
