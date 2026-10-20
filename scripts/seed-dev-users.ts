import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

if (process.env.SEED_ENV !== "dev") {
  throw new Error("seed:dev-users exige SEED_ENV=dev.");
}

if (process.env.VERCEL) {
  throw new Error("Usuários fictícios não podem ser criados na Vercel.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.",
  );
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [
  { email: "dev-ana@example.com", nickname: "dev-ana" },
  { email: "dev-bruno@example.com", nickname: "dev-bruno" },
];

// Mesma normalização de public.normalize_nickname (lower + trim + espaços).
function normalizeNickname(nickname: string) {
  return nickname.trim().replace(/\s+/g, " ").toLowerCase();
}

async function hasProfile(userId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível consultar o profile: ${error.message}`);
  }

  return Boolean(data);
}

async function createProfile(userId: string, nickname: string) {
  const { error } = await admin.from("profiles").insert({
    id: userId,
    nickname,
    normalized_nickname: normalizeNickname(nickname),
  });

  if (error) {
    throw new Error(`Falha ao criar o profile de ${nickname}: ${error.message}`);
  }
}

async function main() {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Não foi possível listar usuários: ${listError.message}`);
  }

  for (const user of users) {
    const existing = listed.users.find((item) => item.email === user.email);

    if (existing) {
      // Conta criada antes de as migrations existirem nunca passou pelo trigger
      // handle_new_user e ficou sem profile: some do ranking e o header a trata
      // como visitante. O reparo aqui mantém o script idempotente e corretivo.
      if (await hasProfile(existing.id)) {
        console.log(`Usuário de dev já existe: ${user.nickname}`);
      } else {
        await createProfile(existing.id, user.nickname);
        console.log(
          `Profile criado para ${user.nickname} (usuário já existia sem profile)`,
        );
      }

      continue;
    }

    const password = randomBytes(18).toString("base64url");

    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { nickname: user.nickname },
    });

    if (error) {
      throw new Error(`Falha ao criar ${user.nickname}: ${error.message}`);
    }

    if (!data.user) {
      throw new Error(`Falha ao criar ${user.nickname}: usuário não retornado.`);
    }

    // O profile é responsabilidade exclusiva do trigger on_auth_user_created.
    // Se ele não rodou (migrations ausentes ou alteradas), falha alto em vez de
    // deixar um usuário invisível no ranking.
    if (!(await hasProfile(data.user.id))) {
      throw new Error(
        `O trigger handle_new_user não criou o profile de ${user.nickname}. Confira as migrations aplicadas.`,
      );
    }

    console.log(`Criado ${user.nickname} (${user.email})`);
    console.log(`  senha (exibida uma vez): ${password}`);
  }

  console.log("Usuários fictícios são apenas para desenvolvimento local.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao criar usuários.");
  process.exitCode = 1;
});
