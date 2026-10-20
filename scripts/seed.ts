import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const optionSchema = z.object({
  body: z.string().min(1).max(300),
  correct: z.boolean(),
});

const questionSchema = z.object({
  externalId: z.string().min(1),
  level: z.enum(["facil", "basico", "intermediario", "avancado", "especialista"]),
  subject: z.enum(["fundamentos", "configuracao", "fluxo"]),
  prompt: z.string().min(1).max(500),
  explanation: z.string().min(1).max(1000),
  options: z.array(optionSchema).length(9),
});

const seedSchema = z.object({
  meta: z.object({
    version: z.number().int().positive(),
    reviewed_by: z.string(),
    reviewed_at: z.string(),
    source: z.string().min(1),
  }),
  questions: z.array(questionSchema).length(200),
});

const LEVEL_IDS = {
  facil: 1,
  basico: 2,
  intermediario: 3,
  avancado: 4,
  especialista: 5,
} as const;

const SUBJECT_IDS = {
  fundamentos: 1,
  configuracao: 2,
  fluxo: 3,
} as const;

const SUBJECT_PREFIX = {
  fundamentos: "FUND",
  configuracao: "CONF",
  fluxo: "FLUX",
} as const;

const SUBJECT_ORDER = ["fundamentos", "configuracao", "fluxo"] as const;
const EXPECTED_BY_LEVEL = [13, 13, 14];

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function validateSeed(seed: z.infer<typeof seedSchema>, seedEnv: string) {
  const seenIds = new Set<string>();
  const seenPrompts = new Set<string>();
  const perLevel = new Map<number, Map<string, number>>();

  for (const question of seed.questions) {
    if (seenIds.has(question.externalId)) {
      throw new Error(`external_id duplicado: ${question.externalId}`);
    }
    seenIds.add(question.externalId);

    const promptKey = normalize(question.prompt);
    if (seenPrompts.has(promptKey)) {
      throw new Error(`enunciado duplicado: ${question.externalId}`);
    }
    seenPrompts.add(promptKey);

    const levelId = LEVEL_IDS[question.level];
    const expectedPrefix = SUBJECT_PREFIX[question.subject];
    const pattern = new RegExp(`^${expectedPrefix}-F${levelId}-\\d{3}$`);
    if (!pattern.test(question.externalId)) {
      throw new Error(
        `external_id fora do padrão ${expectedPrefix}-F${levelId}-NNN: ${question.externalId}`,
      );
    }

    const correct = question.options.filter((option) => option.correct);
    if (correct.length !== 1) {
      throw new Error(`questão ${question.externalId} precisa de exatamente 1 correta`);
    }

    const bodies = question.options.map((option) => normalize(option.body));
    if (new Set(bodies).size !== bodies.length) {
      throw new Error(`questão ${question.externalId} tem alternativas duplicadas`);
    }

    if (!perLevel.has(levelId)) {
      perLevel.set(levelId, new Map());
    }
    const subjectCounts = perLevel.get(levelId)!;
    subjectCounts.set(
      question.subject,
      (subjectCounts.get(question.subject) ?? 0) + 1,
    );
  }

  for (let levelId = 1; levelId <= 5; levelId += 1) {
    const subjectCounts = perLevel.get(levelId);
    if (!subjectCounts) {
      throw new Error(`nível ${levelId} sem questões`);
    }

    const total = [...subjectCounts.values()].reduce((sum, count) => sum + count, 0);
    if (total !== 40) {
      throw new Error(`nível ${levelId} tem ${total} questões (esperado 40)`);
    }

    SUBJECT_ORDER.forEach((subject, index) => {
      const count = subjectCounts.get(subject) ?? 0;
      if (count !== EXPECTED_BY_LEVEL[index]) {
        throw new Error(
          `nível ${levelId}/${subject} tem ${count} questões (esperado ${EXPECTED_BY_LEVEL[index]})`,
        );
      }
    });
  }

  const reviewed = seed.meta.reviewed_by.trim().toLowerCase();
  const placeholders = new Set([
    "",
    "pendente",
    "pendente de revisão",
    "a revisar",
    "revisar",
    "todo",
    "tbd",
    "placeholder",
    // D26 exige revisão HUMANA. Um campo preenchido pelo agente (ou por IA)
    // não é revisão humana, então precisa reprovar o gate como todo resto.
    "automático",
    "automatico",
    "automatic",
    "auto",
    "agente",
    "ia",
    "llm",
    "modelo",
  ]);

  if (seedEnv === "production" && placeholders.has(reviewed)) {
    throw new Error(
      "meta.reviewed_by precisa estar preenchido para seed de produção (revisão humana, D26).",
    );
  }

  return { perLevel, reviewed: seed.meta.reviewed_by };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const envArg = args.find((arg) => arg.startsWith("--env="))?.split("=")[1];
  const seedEnv = envArg ?? process.env.SEED_ENV ?? "dev";

  if (seedEnv !== "dev" && seedEnv !== "production") {
    throw new Error("Use --env=dev ou --env=production.");
  }

  const raw = await readFile(resolve("supabase/seed/questions.json"), "utf8");
  const parsed = seedSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error(parsed.error.issues.slice(0, 10));
    throw new Error("questions.json inválido.");
  }

  const { perLevel, reviewed } = validateSeed(parsed.data, seedEnv);

  if (seedEnv === "production" && reviewed.trim().toLowerCase().includes("pendente")) {
    throw new Error("Seed de produção ainda está pendente de revisão humana.");
  }

  console.log(`Seed válido: ${parsed.data.questions.length} questões.`);
  for (let levelId = 1; levelId <= 5; levelId += 1) {
    const counts = perLevel.get(levelId)!;
    const summary = SUBJECT_ORDER.map(
      (subject) => `${subject}=${counts.get(subject) ?? 0}`,
    ).join(", ");
    console.log(`  nível ${levelId}: ${summary}`);
  }

  if (dryRun) {
    console.log("Dry-run: nenhuma chamada ao Supabase foi feita.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.",
    );
  }

  if (process.env.VERCEL) {
    throw new Error("O seed não pode rodar na Vercel; execute localmente.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ids: string[] = [];

  for (const [index, question] of parsed.data.questions.entries()) {
    const { error } = await supabase.rpc("seed_question", {
      p_external_id: question.externalId,
      p_level_id: LEVEL_IDS[question.level],
      p_subject_id: SUBJECT_IDS[question.subject],
      p_prompt: question.prompt,
      p_explanation: question.explanation,
      p_options: question.options,
    });

    if (error) {
      throw new Error(`Falha em ${question.externalId}: ${error.message}`);
    }

    ids.push(question.externalId);

    if ((index + 1) % 20 === 0) {
      console.log(`  ${index + 1}/200 questões gravadas...`);
    }
  }

  const { data: deactivated, error: finalizeError } = await supabase.rpc(
    "seed_finalize",
    { p_external_ids: ids },
  );

  if (finalizeError) {
    throw new Error(`Falha ao finalizar seed: ${finalizeError.message}`);
  }

  console.log(
    `Seed concluído: ${ids.length} questões ativas; ${deactivated ?? 0} desativadas.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha no seed.");
  process.exitCode = 1;
});
